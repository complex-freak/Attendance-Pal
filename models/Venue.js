const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
    name: { type: String, required: true },
    capacity: { type: Number, required: true },
    isBooked: { type: Boolean, default: false },
    bookingExpiry: { type: Date },
});

module.exports = mongoose.model('Venue', venueSchema);
