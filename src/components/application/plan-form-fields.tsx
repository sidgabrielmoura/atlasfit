"use client";

import { type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FeaturesManager, updateFeaturesWithFields } from "./plan-features";

export interface PlanFormValue {
  name: string;
  price: string;
  interval: string;
  features: string;
  imageUrl: string;
  maxWorkspaces: string;
  maxStudents: string;
  importQuota: string;
  storageLimitMb: string;
  paymentMethods: string;
}

export function PlanFormFields({ value, onChange, idPrefix, children, billingFields }: {
  value: PlanFormValue;
  onChange: (updates: Partial<PlanFormValue>) => void;
  idPrefix: string;
  children?: ReactNode;
  billingFields?: ReactNode;
}) {
  function quantities(updates: Partial<PlanFormValue>) {
    const next = { ...value, ...updates };
    onChange({ ...updates, features: updateFeaturesWithFields(next.features, next.maxStudents, next.importQuota, next.maxWorkspaces, next.storageLimitMb) });
  }
  return (
    <FieldGroup className="gap-6">
      <FieldSet className="gap-4">
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-name`}>Nome do Plano</FieldLabel>
          <Input id={`${idPrefix}-name`} required minLength={2} maxLength={100} value={value.name} onChange={e => onChange({ name: e.target.value })} placeholder="Ex: Pro Unlimited" />
        </Field>
      </FieldSet>

      <Separator />

      <FieldSet className="gap-4">
        <FieldLegend variant="label">Cobrança e recorrência</FieldLegend>
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-price`}>Valor do Plano (R$)</FieldLabel>
            <Input id={`${idPrefix}-price`} type="number" min="0" step="0.01" required value={value.price} onChange={e => onChange({ price: e.target.value })} placeholder="0.00" />
          </Field>
          {billingFields ?? <>
            <Field>
              <FieldLabel>Periodicidade</FieldLabel>
              <ToggleGroup type="single" variant="outline" className="grid w-full grid-cols-2" value={value.interval} onValueChange={interval => interval && onChange({ interval })} aria-label="Periodicidade">
                <ToggleGroupItem value="month">Mensal</ToggleGroupItem>
                <ToggleGroupItem value="year">Anual</ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field>
              <FieldLabel>Forma de pagamento</FieldLabel>
              <ToggleGroup type="single" variant="outline" className="grid w-full grid-cols-3" value={value.paymentMethods} onValueChange={paymentMethods => paymentMethods && onChange({ paymentMethods })} aria-label="Forma de pagamento">
                <ToggleGroupItem value="PIX">PIX</ToggleGroupItem>
                <ToggleGroupItem value="CARD">Cartão</ToggleGroupItem>
                <ToggleGroupItem value="PIX,CARD">Ambos</ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </>}
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet className="gap-4">
        <FieldLegend variant="label">Limites e capacidade</FieldLegend>
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-workspaces`}>Limite de Workspaces</FieldLabel>
            <Input id={`${idPrefix}-workspaces`} type="number" min="1" required value={value.maxWorkspaces} onChange={e => quantities({ maxWorkspaces: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-students`}>Limite de Alunos</FieldLabel>
            <Input id={`${idPrefix}-students`} type="number" min="1" value={value.maxStudents} onChange={e => quantities({ maxStudents: e.target.value })} placeholder="Ilimitado" />
            <FieldDescription>Deixe em branco para alunos ilimitados.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-imports`}>Quota de Importações (alunos/mês)</FieldLabel>
            <Input id={`${idPrefix}-imports`} type="number" min="0" required value={value.importQuota} onChange={e => quantities({ importQuota: e.target.value })} />
            <FieldDescription>0 = importações ilimitadas.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-storage`}>Limite de Armazenamento (MB)</FieldLabel>
            <Input id={`${idPrefix}-storage`} type="number" min="0" required value={value.storageLimitMb} onChange={e => quantities({ storageLimitMb: e.target.value })} />
            <FieldDescription>1024 MB = 1 GB. 0 = armazenamento ilimitado.</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <Separator />

      <FieldSet className="gap-4">
        <FieldLegend variant="label">Destaques / Vantagens do Plano</FieldLegend>
        <FeaturesManager value={value.features} onChange={features => onChange({ features })} />
      </FieldSet>
      {children}
    </FieldGroup>
  );
}
