export interface SequenceDefinition {
  type: "sequence";
  participants: ParticipantDef[];
  messages: MessageDef[];
}

export interface ParticipantDef {
  id: string;
  label: string;
}

export interface MessageDef {
  from: string;
  to: string;
  label?: string;
  type?: "solid" | "dashed"; // solid = request, dashed = response
}
