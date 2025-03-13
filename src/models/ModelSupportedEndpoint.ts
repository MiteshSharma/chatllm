import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Model } from "./Model";

@Entity("model_supported_endpoints")
export class ModelSupportedEndpoint {
  @PrimaryColumn("uuid")
  modelId: string;

  @PrimaryColumn({ length: 100 })
  endpoint: string;

  @ManyToOne(() => Model, model => model.supportedEndpoints, { onDelete: "CASCADE" })
  @JoinColumn({ name: "modelId" })
  model: Model;
} 