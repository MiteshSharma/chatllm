import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Model } from "./Model";

@Entity("model_required_roles")
export class ModelRequiredRole {
  @PrimaryColumn("uuid")
  modelId: string;

  @PrimaryColumn({ length: 50 })
  role: string;

  @ManyToOne(() => Model, model => model.requiredRoles, { onDelete: "CASCADE" })
  @JoinColumn({ name: "modelId" })
  model: Model;
} 