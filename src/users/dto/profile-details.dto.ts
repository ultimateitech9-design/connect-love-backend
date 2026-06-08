export class ProfileDetailsDto {
  id: number | string;
  name: string;
  age?: number;
  dob?: string;
  gender?: string;
  profession?: string;
  height?: string;
  city?: string;
  bio?: string;
  interests?: string[];
  personality?: string[];
  hobbies?: string[];
  avatarUrl?: string;
  photos?: string[];
  isVerified?: boolean;
}
