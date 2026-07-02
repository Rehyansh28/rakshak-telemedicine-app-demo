import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Phone, PhoneOff, User, Clock, ShieldAlert } from 'lucide-react';

export default function IncomingCallModal({ call, onAccept, onReject }) {
  if (!call) return null;

  const requestTime = call.requestedAt 
    ? new Date(call.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : 'Just now';

  return (
    <Modal open={!!call} onClose={onReject} title="INCOMING CONSULTATION REQUEST" size="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-error-container/10 border border-error/20">
          <div className="w-12 h-12 rounded-full bg-error-container/20 border-2 border-error flex items-center justify-center animate-pulse">
            <Phone className="w-6 h-6 text-error" />
          </div>
          <div>
            <h3 className="font-sora font-bold text-primary text-base">Emergency Video Request</h3>
            <p className="text-xs text-on-surface-variant">Active field medic requesting live command link</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3">
          <div className="flex justify-between items-center text-sm border-b border-outline-variant/20 pb-2">
            <span className="text-on-surface-variant flex items-center gap-1.5"><User className="w-4 h-4" /> Soldier</span>
            <span className="font-bold text-primary">{call.patient?.name} ({call.patient?.id})</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-outline-variant/20 pb-2">
            <span className="text-on-surface-variant flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Regiment</span>
            <span className="font-medium">{call.patient?.regiment}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-b border-outline-variant/20 pb-2">
            <span className="text-on-surface-variant flex items-center gap-1.5"><Clock className="w-4 h-4" /> Requested At</span>
            <span className="font-mono text-xs">{requestTime}</span>
          </div>
          <div className="flex justify-between items-center text-sm pb-1">
            <span className="text-on-surface-variant flex items-center gap-1.5">Queue Position</span>
            <span className="font-mono font-bold text-secondary">#{call.queuePosition || 1}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onReject}
            icon={PhoneOff}
            className="flex-1 bg-surface-container-high hover:bg-error-container/20 text-error hover:text-error border border-outline-variant/30"
          >
            Reject Link
          </Button>
          <Button
            onClick={onAccept}
            icon={Phone}
            className="flex-1 bg-secondary text-primary hover:bg-secondary/90 border-0"
          >
            Establish Link
          </Button>
        </div>
      </div>
    </Modal>
  );
}
