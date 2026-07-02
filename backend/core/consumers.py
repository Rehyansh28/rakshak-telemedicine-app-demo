import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs
from rest_framework.authtoken.models import Token
from channels.db import database_sync_to_async

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
    # If the user is the doctor assigned to the call
    if consultation.doctor and consultation.doctor.user == user:
        return True
    # If the user is any active medical staff
    if MedicalStaff.objects.filter(user=user).exists():
        return True
    # If the user is the patient themselves
    if consultation.patient.user == user:
        return True
    return False

class CallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'call_{self.room_id}'

        # Parse token from query parameter
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token_list = query_params.get('token', [])
        
        if not token_list:
            await self.close(code=4003)  # Forbidden
            return
            
        token_key = token_list[0]
        user = await get_user_from_token(token_key)
        
        if not user:
            await self.close(code=4003)  # Forbidden
            return

        consultation = await get_consultation_by_room(self.room_id)
        if not consultation:
            await self.close(code=4004)  # Not Found
            return

        is_allowed = await validate_consultation_access(consultation, user)
        if not is_allowed:
            await self.close(code=4003)  # Forbidden
            return

        self.user = user
        self.scope['user'] = user

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Check if user is doctor or staff to determine role
        from .models import Doctor
        is_doctor = await database_sync_to_async(Doctor.objects.filter(user=user).exists)()
        role = 'doctor' if is_doctor else 'staff'

        # Notify other room members that a peer has connected
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'peer_joined',
                'sender_channel_name': self.channel_name,
                'role': role
            }
        )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        # Notify other room members that a peer has disconnected
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'peer_left',
                'sender_channel_name': self.channel_name
            }
        )

    # Receive message from WebSocket client
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        # Broadcast signal to other channel members in the room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'signal_message',
                'message': data,
                'sender_channel_name': self.channel_name
            }
        )

    # Receive signal from room group and forward to client
    async def signal_message(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps(event['message']))

    # Receive peer joined event from room group and forward to client
    async def peer_joined(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'peer-joined',
                'role': event['role']
            }))

    # Receive peer left event from room group and forward to client
    async def peer_left(self, event):
        if self.channel_name != event['sender_channel_name']:
            await self.send(text_data=json.dumps({
                'type': 'peer-left'
            }))
