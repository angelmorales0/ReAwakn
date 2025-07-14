export type Message = {
  created_at: string; // These need to be kept snake case for database parsing, will be refactored at a later date
  text: string;
  sent_by: string;
};
