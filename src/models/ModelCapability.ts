import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Model } from "./Model";

export enum CapabilityType {
  TEXT = "text",
  VISION = "vision",
  FUNCTION_CALLING = "function_calling",
  CODE = "code",
  KNOWLEDGE_RETRIEVAL = "knowledge_retrieval"
}

@Entity("model_capabilities")
export class ModelCapability {
  @PrimaryColumn("uuid")
  modelId: string;

  @PrimaryColumn({
    type: "enum",
    enum: CapabilityType,
    enumName: "model_capability"
  })
  capability: CapabilityType;

  @ManyToOne(() => Model, model => model.capabilities, { onDelete: "CASCADE" })
  @JoinColumn({ name: "modelId" })
  model: Model;
} 