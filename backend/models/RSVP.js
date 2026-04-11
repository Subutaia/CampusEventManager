import mongoose from 'mongoose';

const rsvpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Event ID is required'],
    ref: 'Event'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Ensure unique RSVP per user per event
rsvpSchema.index({ userId: 1, eventId: 1 }, { unique: true });

export default mongoose.model('RSVP', rsvpSchema);
