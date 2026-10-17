const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    customerType: {
      type: String,
      enum: ["Homeowner", "Investor", "Real estate developer", "Other"],
      default: "Homeowner"
    },
    preferredDay: { type: String, default: "", maxlength: 20 },
    message: { type: String, default: "", maxlength: 3000 },
    source: { type: String, enum: ["website", "chat", "voice", "manual"], default: "website" },
    status: {
      type: String,
      enum: ["New Lead", "Contacted", "Qualified", "Appointment Booked", "Proposal Sent", "Won", "Lost"],
      default: "New Lead"
    },
    notes: { type: String, default: "", maxlength: 5000 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
