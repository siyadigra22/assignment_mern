const mongoose = require('mongoose');
const { Schema } = mongoose;

const documentSchema = new Schema({
  fileName: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'pdf'], required: true },
  file: { type: Schema.Types.Mixed, required: true },
});

const submissionSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dateOfBirth: { type: Date, required: true },
  residentialStreet1: { type: String, required: true },
  residentialStreet2: { type: String },
  sameAsResidential: { type: Boolean, required: true },
  permanentStreet1: { type: String },
  permanentStreet2: { type: String },
  documents: { type: [documentSchema], validate: [arrayLimit, 'At least two documents are required'] },
});

// Ensure that there are at least two documents
function arrayLimit(val) {
  return val.length >= 2;
}

module.exports = mongoose.model('Submission', submissionSchema);