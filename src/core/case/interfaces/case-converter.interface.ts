export interface ICaseConverter {
  toWire(value: unknown): unknown;
  fromWire(value: unknown): unknown;
}
