export type PianoKeyLayout = {
  midi: number;
  noteName: string;
  isBlack: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

export type PianoKeyActiveSource = "left" | "right" | "manual";
