import json
from collections import defaultdict

from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from rest_framework.authtoken.models import Token
from channels.db import database_sync_to_async

# Tracks active peers per call room so late joiners learn who is already present.
ROOM_PEERS = defaultdict(dict)


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.select_related('user').get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return None


@database_sync_to_async
def get_consultation_by_room(room_id):
    from .models import Consultation
    try:
        return Consultation.objects.select_related('patient', 'doctor', 'doctor__user').get(room_id=room_id)
    except Consultation.DoesNotExist:
        return None


@database_sync_to_async
def validate_consultation_access(consultation, user):
    from .models import MedicalStaff
    if consultation.doctor and consultation.doctor.user == user:
        return True
    if MedicalStaff.objects.filter(user=user).exists():
        return True
    if consultation.patient.user == user:
        return True
    return False


class CallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(f"[CallConsumer] Connect request received for room: {self.scope['url_route']['kwargs'].get('room_id')}")
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'call_{self.room_id}'

        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token_list = query_params.get('token', [])

        if not token_list:
            await self.close(code=4003)
            return

        token_key = token_list[0]
        user = await get_user_from_token(token_key)
        if not user:
            await self.close(code=4003)
            return

        consultation = await get_consultation_by_room(self.room_id)
        if not consultation:
            await self.close(code=4004)
            return

        is_allowed = await validate_consultation_access(consultation, user)
        if not is_allowed:
            await self.close(code=4003)
            return

        self.user = user
        self.scope['user'] = user

        from .models import Doctor
        is_doctor = await database_sync_to_async(Doctor.objects.filter(user=user).exists)()
        self.role = 'doctor' if is_doctor else 'staff'

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Tell the newcomer about peers that joined before them (e.g. staff waiting for doctor).
        for channel_name, role in list(ROOM_PEERS[self.room_id].items()):
            if channel_name != self.channel_name:
                await self.send(text_data=json.dumps({
                    'type': 'peer-joined',
                    'role': role,
                }))

        ROOM_PEERS[self.room_id][self.channel_name] = self.role

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'peer_joined',
                'sender_channel_name': self.channel_name,
                'role': self.role,
            },
        )

    async def disconnect(self, close_code):
        ROOM_PEERS[self.room_id].pop(self.channel_name, None)
        if not ROOM_PEERS[self.room_id]:
            ROOM_PEERS.pop(self.room_id, None)

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'peer_left',
                'sender_channel_name': self.channel_name,
            },
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if data.get('type') == 'ping':
            try:
                await self.send(text_data=json.dumps({'type': 'pong'}))
            except Exception:
                pass
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data,
                'sender_channel_name': self.channel_name,
            },
        )

    async def signal_message(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['message']))

    async def peer_joined(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'peer-joined',
                'role': event['role'],
            }))

    async def peer_left(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'peer-left',
            }))
