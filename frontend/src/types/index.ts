// Types for Fuzzy Matching
export interface ProductItem {
  UPC: string;
  Item: string;
  [key: string]: string | number | undefined;
}

export interface FuzzyMatch {
  matchType: 'Identical' | 'Suggested';
  suggestedUPC: string;
  suggestedDescription: string;
  score: number;
  urlSKU?: string;
  image?: string;
  finalPrice?: string;
}

export interface FuzzyResult {
  UPC: string;
  Item: string;
  matches: FuzzyMatch[];
}

export interface FuzzyProcessingResponse {
  success: boolean;
  results: FuzzyResult[];
  totalPivot: number;
  totalComparison: number;
  processingTime: number;
  error?: string;
}

// Types for Google Lens
export interface GoogleLensResult {
  title: string;
  link: string;
  source: string;
  thumbnail?: string;
  price?: string;
}

export interface GoogleLensResponse {
  success: boolean;
  results: GoogleLensResult[];
  imageUrl: string;
  error?: string;
}

// File upload types
export interface FileUploadState {
  file: File | null;
  fileName: string;
  isUploading: boolean;
  error: string | null;
}
