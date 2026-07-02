from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from .models import Patient, Doctor, MedicalStaff, Consultation, ConsultationQueue


class ConsultationAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.staff_user = User.objects.create_user(username="staff", password="password")
        self.doctor_user = User.objects.create_user(username="doctor", password="password")
        
        # Create profiles
        self.staff = MedicalStaff.objects.create(
            user=self.staff_user, name="Staff member", rank="Havildar", post="Field post 1"
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user, name="Doctor officer", rank="Captain", unit="Medical Unit 3"
        )
        
        # Create patient
        self.patient = Patient.objects.create(
            soldier_id="SLD-001",
            name="Soldier Test",
            rank="Sepoy",
            regiment="Rajputana Rifles",
            status="stable",
            altitude=1000,
            heart_rate=75,
            spo2=98,
            temp=36.5,
            fatigue=10,
            stress=12,
            location="Srinagar Sector",
            last_update_label="Just now"
        )

    def test_call_request_endpoint(self):
        # Auth as staff
        self.client.force_authenticate(user=self.staff_user)
        
        # Place request
        response = self.client.post("/api/call/request/", {"soldierId": "SLD-001"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("roomId", response.data)
        self.assertEqual(response.data["status"], "waiting")
        
        # Verify DB changes
        self.assertEqual(Consultation.objects.count(), 1)
        consultation = Consultation.objects.first()
        self.assertEqual(consultation.status, "waiting")
        self.assertEqual(consultation.patient, self.patient)
        
        # Verify Patient status updated to consultation
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.status, "consultation")
        
        # Verify ConsultationQueue entry created
        self.assertTrue(ConsultationQueue.objects.filter(patient=self.patient).exists())

    def test_call_accept_endpoint(self):
        # Create a consultation request
        consultation = Consultation.objects.create(
            patient=self.patient,
            status="waiting",
            room_id="room_test_123",
            requested_at=timezone.now()
        )
        
        # Auth as doctor
        self.client.force_authenticate(user=self.doctor_user)
        
        # Accept request
        response = self.client.post("/api/call/accept/", {"consultationId": consultation.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "accepted")
        self.assertEqual(response.data["doctor"]["name"], self.doctor.name)
        
        # Verify DB changes
        consultation.refresh_from_db()
        self.assertEqual(consultation.status, "accepted")
        self.assertEqual(consultation.doctor, self.doctor)
        self.assertIsNotNone(consultation.accepted_at)

    def test_call_reject_endpoint(self):
        # Create a consultation request
        consultation = Consultation.objects.create(
            patient=self.patient,
            status="waiting",
            room_id="room_test_123",
            requested_at=timezone.now()
        )
        ConsultationQueue.objects.create(
            patient=self.patient,
            queue_position=1,
            estimated_wait_minutes=5
        )
        
        # Auth as doctor
        self.client.force_authenticate(user=self.doctor_user)
        
        # Reject request
        response = self.client.post("/api/call/reject/", {"consultationId": consultation.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "rejected")
        
        # Verify DB changes
        consultation.refresh_from_db()
        self.assertEqual(consultation.status, "rejected")
        
        # Verify Patient status reset
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.status, "stable")
        
        # Verify Dequeued
        self.assertFalse(ConsultationQueue.objects.filter(patient=self.patient).exists())

    def test_call_end_endpoint(self):
        # Create accepted call
        consultation = Consultation.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            status="accepted",
            room_id="room_test_123",
            requested_at=timezone.now() - timezone.timedelta(minutes=10),
            accepted_at=timezone.now() - timezone.timedelta(minutes=9)
        )
        ConsultationQueue.objects.create(
            patient=self.patient,
            queue_position=1,
            estimated_wait_minutes=5
        )
        
        # Auth as doctor
        self.client.force_authenticate(user=self.doctor_user)
        
        # End call
        response = self.client.post("/api/call/end/", {"roomId": "room_test_123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ended")
        self.assertIsNotNone(response.data["duration"])
        
        # Verify DB changes
        consultation.refresh_from_db()
        self.assertEqual(consultation.status, "ended")
        self.assertIsNotNone(consultation.ended_at)
        self.assertGreater(consultation.duration, 0)
        
        # Verify Dequeued
        self.assertFalse(ConsultationQueue.objects.filter(patient=self.patient).exists())

    def test_call_requests_list_endpoint(self):
        # Create a consultation request
        Consultation.objects.create(
            patient=self.patient,
            status="waiting",
            room_id="room_test_123",
            requested_at=timezone.now()
        )
        
        # Auth as doctor
        self.client.force_authenticate(user=self.doctor_user)
        
        # Get requests
        response = self.client.get("/api/call/requests/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["roomId"], "room_test_123")
