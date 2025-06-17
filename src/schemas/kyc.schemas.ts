import { z } from 'zod';

// KYC document validation schemas
const ninSchema = z.string()
  .regex(/^[0-9]{11}$/, 'NIN must be exactly 11 digits')
  .optional();

const bvnSchema = z.string()
  .regex(/^[0-9]{11}$/, 'BVN must be exactly 11 digits')
  .optional();

const urlSchema = z.string()
  .url('Invalid URL format')
  .refine((url) => {
    return /^https?:\/\/.+\.(jpg|jpeg|png|pdf)$/i.test(url);
  }, 'URL must point to a valid image or PDF file')
  .optional();

const selfieUrlSchema = z.string()
  .url('Invalid URL format')
  .refine((url) => {
    return /^https?:\/\/.+\.(jpg|jpeg|png)$/i.test(url);
  }, 'Selfie URL must point to a valid image file (jpg, jpeg, png)')
  .optional();

// KYC submission schema
export const submitKYCSchema = z.object({
  tier: z.number()
    .int('Tier must be an integer')
    .min(2, 'Minimum tier is 2')
    .max(3, 'Maximum tier is 3'),
  
  documents: z.object({
    nin: ninSchema,
    bvn: bvnSchema,
    selfieUrl: selfieUrlSchema,
    addressProofUrl: urlSchema
  }).refine((docs) => {
    // Custom validation based on tier requirements
    return true; // Will be validated in service layer
  }, 'Invalid document combination for requested tier')
});

// Admin KYC approval/rejection schemas
export const approveKYCSchema = z.object({
  kycId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid KYC ID format')
});

export const rejectKYCSchema = z.object({
  kycId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid KYC ID format'),
  
  reason: z.string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(1000, 'Rejection reason cannot exceed 1000 characters')
});

// KYC query schemas
export const kycHistorySchema = z.object({
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .optional()
    .default(20),
  
  offset: z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .optional()
    .default(0)
});

export const pendingKYCSchema = z.object({
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  
  offset: z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset must be non-negative')
    .optional()
    .default(0),
  
  status: z.enum(['pending', 'under_review', 'all'])
    .optional()
    .default('pending')
});

// Tier requirements schema
export const tierRequirementsSchema = z.object({
  tier: z.number()
    .int('Tier must be an integer')
    .min(1, 'Minimum tier is 1')
    .max(3, 'Maximum tier is 3')
});

// Admin action schemas
export const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'review']),
  kycId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid KYC ID format'),
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason cannot exceed 1000 characters')
    .optional()
});

// Bulk operations schema
export const bulkKYCActionSchema = z.object({
  kycIds: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid KYC ID format')
  ).min(1, 'At least one KYC ID is required')
   .max(50, 'Cannot process more than 50 KYC requests at once'),
  
  action: z.enum(['approve', 'reject']),
  
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason cannot exceed 1000 characters')
    .optional()
});

// Document upload validation
export const documentUploadSchema = z.object({
  documentType: z.enum(['nin', 'bvn', 'selfie', 'address_proof']),
  
  fileUrl: z.string()
    .url('Invalid file URL')
    .refine((url) => {
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
      const extension = url.split('.').pop()?.toLowerCase();
      return allowedExtensions.includes(extension || '');
    }, 'File must be jpg, jpeg, png, or pdf format'),
  
  fileSize: z.number()
    .max(5 * 1024 * 1024, 'File size cannot exceed 5MB')
    .optional(),
  
  metadata: z.object({
    originalName: z.string().optional(),
    uploadedAt: z.date().optional(),
    fileHash: z.string().optional()
  }).optional()
});

// Type exports
export type SubmitKYCInput = z.infer<typeof submitKYCSchema>;
export type ApproveKYCInput = z.infer<typeof approveKYCSchema>;
export type RejectKYCInput = z.infer<typeof rejectKYCSchema>;
export type KYCHistoryInput = z.infer<typeof kycHistorySchema>;
export type PendingKYCInput = z.infer<typeof pendingKYCSchema>;
export type TierRequirementsInput = z.infer<typeof tierRequirementsSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
export type BulkKYCActionInput = z.infer<typeof bulkKYCActionSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
