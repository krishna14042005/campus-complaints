import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });
const person = { name: { type: String, required: true, trim: true }, email: { type: String, required: true, unique: true, lowercase: true, trim: true }, password: { type: String, required: true }, phone: String, active: { type: Boolean, default: true } };
export const Student = model('Student', new Schema({ ...person, rollNo: String, department: String, hostel: String }, { timestamps: true }));
export const Admin = model('Admin', new Schema(person, { timestamps: true }));
export const Staff = model('MaintenanceStaff', new Schema({ ...person, specialty: String }, { timestamps: true }));
export const Complaint = model('Complaint', new Schema({
  complaintId: { type: String, unique: true }, student: ref('Student'), studentName: String,
  category: String, title: String, description: String,
  location: { block: String, floor: String, room: String },
  images: [String], beforeImages: [String], afterImages: [String],
  aiCategory: String, aiPriority: String, priority: { type: String, default: 'Medium' },
  sentiment: String, summary: String, recommendation: String, duplicateOf: String,
  assignedStaff: ref('MaintenanceStaff'),
  status: { type: String, default: 'Submitted' },
  adminRemarks: String, resolutionRemarks: String, resolvedAt: Date,
  rating: Number, feedback: String
}, { timestamps: true }));
export const Notification = model('Notification', new Schema({ user: ref('Student'), role: String, message: String, complaintId: String, complaint: ref('Complaint'), read: { type: Boolean, default: false } }, { timestamps: true }));
export const Feedback = model('Feedback', new Schema({ complaint: ref('Complaint'), student: ref('Student'), rating: { type: Number, min: 1, max: 5 }, comment: String }, { timestamps: true }));
export const History = model('ComplaintHistory', new Schema({ complaint: ref('Complaint'), complaintId: String, action: String, by: String, byRole: String, note: String }, { timestamps: true }));
