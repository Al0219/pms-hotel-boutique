/** Password exists only while this request crosses the auth boundary. */
export interface GuestLoginRequest {
  email: string;
  password: string;
}
