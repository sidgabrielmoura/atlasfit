"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardCheck,
  Scale,
  Ruler,
  Flame,
  Activity,
  Heart,
  FileText,
  Calendar,
  AlertTriangle,
  User,
  HeartPulse,
  Info,
  Maximize2,
  X,
  Printer
} from "lucide-react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";

interface PhysicalEvaluationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: any;
}

export function PhysicalEvaluationDetailModal({
  isOpen,
  onClose,
  evaluation
}: PhysicalEvaluationDetailModalProps) {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [activeTab, setActiveTab] = useState("anamnese");
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  if (!evaluation) return null;

  const handlePrintEvaluation = () => {
    const primaryColor = activeWs?.primaryColor || "#ea580c";
    const logoUrl = activeWs?.logoUrl || "";
    const workspaceName = activeWs?.name || "";
    const watermarkUrl = activeWs?.watermarkUrl || "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDateStr = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        });
      } catch (e) {
        return dateStr;
      }
    };

    const formatBirthDate = (dateStr: string) => {
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          timeZone: "UTC",
        });
      } catch (e) {
        return dateStr;
      }
    };

    const anamnese = evaluation.anamnese || null;
    const circunferencias = evaluation.circunferencias || null;
    const postural = evaluation.postural || null;
    const dorMobilidade = evaluation.dorMobilidade || null;
    const testesFisicos = evaluation.testesFisicos || null;
    const dobras = evaluation.dobras || null;

    const weight = evaluation.weight || 0;
    const height = evaluation.height || 0;
    const bodyFat = evaluation.bodyFat || null;
    const muscleMass = evaluation.muscleMass || null;
    const notes = evaluation.notes || "";

    const imc = anamnese?.imc || (weight && height ? parseFloat((weight / ((height / 100) * (height / 100))).toFixed(2)) : null);
    const imcClass = anamnese?.imcClassification || (() => {
      if (!imc) return "";
      if (imc < 18.5) return "Abaixo do peso";
      if (imc <= 24.9) return "Peso normal";
      if (imc <= 29.9) return "Sobrepeso";
      if (imc <= 34.9) return "Obesidade Grau I";
      if (imc <= 39.9) return "Obesidade Grau II";
      return "Obesidade Grau III";
    })();

    const fatMass = dobras?.fatMass || (weight && bodyFat ? parseFloat((weight * (bodyFat / 100)).toFixed(2)) : null);
    const leanMass = dobras?.leanMass || (weight && bodyFat ? parseFloat((weight * (1 - bodyFat / 100)).toFixed(2)) : null);
    const bfClass = dobras?.classification || "";

    let anamneseHtml = "";
    if (anamnese) {
      anamneseHtml = `
        <div class="section-title">Anamnese / Histórico Clínico</div>
        <div class="grid-2">
          <div class="info-block">
            <span class="info-label">Nome Completo</span>
            <span class="info-val">${anamnese.name || "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Sexo / Gênero</span>
            <span class="info-val">${anamnese.gender === "male" || anamnese.gender === "masculino" ? "Masculino" : "Feminino"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Data de Nascimento</span>
            <span class="info-val">${anamnese.birthDate ? formatBirthDate(anamnese.birthDate) : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Nível de Atividade Física</span>
            <span class="info-val" style="color: ${primaryColor}; text-transform: uppercase;">${anamnese.activityLevel || "Moderado"}</span>
          </div>
        </div>
        
        <div class="grid-2" style="margin-top: 10px;">
          <div class="info-block col-span-2">
            <span class="info-label">Lesões e Dores Musculares</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${anamnese.injuries || "Nenhuma lesão relatada."}</span>
          </div>
          <div class="info-block col-span-2">
            <span class="info-label">Doenças Clínicas</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${anamnese.illnesses || "Nenhuma doença relatada."}</span>
          </div>
          <div class="info-block col-span-2">
            <span class="info-label">Uso de Medicamentos</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${anamnese.medications || "Nenhum medicamento relatado."}</span>
          </div>
          <div class="info-block col-span-2">
            <span class="info-label">Restrições Médicas Específicas</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${anamnese.restrictions || "Nenhuma restrição médica informada."}</span>
          </div>
        </div>

        <div class="grid-3" style="margin-top: 10px;">
          <div class="info-block col-span-2">
            <span class="info-label">Hábitos Alimentares</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${anamnese.eatingHabits || "Sem detalhes informados."}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Qualidade do Sono</span>
            <span class="info-val" style="color: #10b981; text-transform: uppercase;">${anamnese.sleepQuality || "Boa"}</span>
          </div>
        </div>
      `;
    }

    const compHtml = `
      <div class="section-title">Composição Corporal & Antropometria</div>
      <div class="grid-4">
        <div class="info-block">
          <span class="info-label">Peso Corporal</span>
          <span class="info-val">${weight} kg</span>
        </div>
        <div class="info-block">
          <span class="info-label">Altura</span>
          <span class="info-val">${height} cm</span>
        </div>
        <div class="info-block">
          <span class="info-label">IMC</span>
          <span class="info-val">${imc || "—"}</span>
        </div>
        <div class="info-block">
          <span class="info-label">Classificação IMC</span>
          <span class="info-val" style="font-size: 11px; color: #0284c7;">${imcClass || "—"}</span>
        </div>
      </div>

      ${dobras ? `
        <div class="grid-4" style="margin-top: 10px;">
          <div class="info-block">
            <span class="info-label">Percentual de Gordura</span>
            <span class="info-val" style="color: #ef4444;">${bodyFat}%</span>
          </div>
          <div class="info-block">
            <span class="info-label">Massa Gorda</span>
            <span class="info-val">${fatMass} kg</span>
          </div>
          <div class="info-block">
            <span class="info-label">Massa Magra</span>
            <span class="info-val" style="color: #10b981;">${leanMass} kg</span>
          </div>
          <div class="info-block">
            <span class="info-label">Classificação Corporal</span>
            <span class="info-val" style="font-size: 11px; color: #ef4444; text-transform: uppercase;">${bfClass || "Normal"}</span>
          </div>
        </div>
      ` : ""}
    `;

    let circHtml = "";
    if (circunferencias) {
      circHtml = `
        <div class="section-title">Perímetros / Circunferências Corporais</div>
        <div class="grid-4" style="margin-bottom: 20px;">
          <div class="info-block">
            <span class="info-label">Peitoral</span>
            <span class="info-val">${circunferencias.chest ? `${circunferencias.chest} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Cintura</span>
            <span class="info-val">${circunferencias.waist ? `${circunferencias.waist} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Abdômen</span>
            <span class="info-val">${circunferencias.abdomen ? `${circunferencias.abdomen} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Quadril</span>
            <span class="info-val">${circunferencias.hips ? `${circunferencias.hips} cm` : "—"}</span>
          </div>

          <div class="info-block">
            <span class="info-label">Braço Relax. D</span>
            <span class="info-val">${circunferencias.rightArmRelaxed ? `${circunferencias.rightArmRelaxed} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Braço Relax. E</span>
            <span class="info-val">${circunferencias.leftArmRelaxed ? `${circunferencias.leftArmRelaxed} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Braço Contr. D</span>
            <span class="info-val">${circunferencias.rightArmContracted ? `${circunferencias.rightArmContracted} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Braço Contr. E</span>
            <span class="info-val">${circunferencias.leftArmContracted ? `${circunferencias.leftArmContracted} cm` : "—"}</span>
          </div>

          <div class="info-block">
            <span class="info-label">Coxa Direita</span>
            <span class="info-val">${circunferencias.rightThigh ? `${circunferencias.rightThigh} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Coxa Esquerda</span>
            <span class="info-val">${circunferencias.leftThigh ? `${circunferencias.leftThigh} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Panturrilha D</span>
            <span class="info-val">${circunferencias.rightCalf ? `${circunferencias.rightCalf} cm` : "—"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Panturrilha E</span>
            <span class="info-val">${circunferencias.leftCalf ? `${circunferencias.leftCalf} cm` : "—"}</span>
          </div>
        </div>
      `;
    }

    let foldsHtml = "";
    if (dobras) {
      const activeFolds = [];
      if (dobras.peitoral !== undefined) activeFolds.push({ label: "Peitoral", val: dobras.peitoral });
      if (dobras.abdominal !== undefined) activeFolds.push({ label: "Abdominal", val: dobras.abdominal });
      if (dobras.triceps !== undefined) activeFolds.push({ label: "Tricipital", val: dobras.triceps });
      if (dobras.suprailiaca !== undefined) activeFolds.push({ label: "Suprailíaca", val: dobras.suprailiaca });
      if (dobras.coxa !== undefined) activeFolds.push({ label: "Coxa", val: dobras.coxa });

      const foldsSum = activeFolds.reduce((acc, f) => acc + parseFloat(f.val || 0), 0);

      foldsHtml = `
        <div class="section-title">Dobras Cutâneas Pollock</div>
        <div class="grid-4" style="margin-bottom: 20px;">
          ${activeFolds.map(f => `
            <div class="info-block">
              <span class="info-label">${f.label}</span>
              <span class="info-val">${f.val} mm</span>
            </div>
          `).join("")}
          <div class="info-block">
            <span class="info-label">Soma das Dobras</span>
            <span class="info-val" style="font-weight: 900;">${foldsSum.toFixed(1)} mm</span>
          </div>
        </div>
      `;
    }

    let posturalHtml = "";
    if (postural) {
      const activePhotos = Object.entries(postural.photos || {}).filter(([_, url]) => !!url);
      
      posturalHtml = `
        <div class="section-title">Alinhamento Postural</div>
        
        ${activePhotos.length > 0 ? `
          <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; page-break-inside: avoid;">
            ${activePhotos.map(([view, url]) => {
              const label = view === "frontal" ? "Frontal" : view === "posterior" ? "Posterior" : view === "lateralRight" ? "Lat. Direita" : "Lat. Esquerda";
              return `
                <div style="flex: 1; min-width: 120px; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; background: #000; text-align: center;">
                  <img src="${url}" style="width: 100%; height: 140px; object-fit: cover;" />
                  <div style="color: white; font-size: 8px; font-weight: bold; background: #18181b; padding: 4px 0; text-transform: uppercase;">${label}</div>
                </div>
              `;
            }).join("")}
          </div>
        ` : ""}

        <div class="grid-3" style="margin-bottom: 10px;">
          <div class="info-block">
            <span class="info-label">Cabeça</span>
            <span class="info-val" style="font-size: 11px;">${postural.cabeca || "Normal"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Ombros</span>
            <span class="info-val" style="font-size: 11px;">${postural.ombros || "Normal"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Quadril</span>
            <span class="info-val" style="font-size: 11px;">${postural.quadril || "Normal"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Joelhos</span>
            <span class="info-val" style="font-size: 11px;">${postural.joelhos || "Normal"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Tornozelos</span>
            <span class="info-val" style="font-size: 11px;">${postural.tornozelos || "Normal"}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Coluna</span>
            <span class="info-val" style="font-size: 11px;">${postural.coluna || "Normal"}</span>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom: 20px;">
          <div class="info-block">
            <span class="info-label">Desvios Posturais Apontados</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${postural.deviations || "Nenhum desvio crítico apontado."}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Recomendações e Laudo</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${postural.report || "Sem recomendações específicas."}</span>
          </div>
        </div>
      `;
    }

    let painHtml = "";
    if (dorMobilidade) {
      const labels: Record<string, string> = {
        cervical: "Cervical", ombro_d: "Ombro D", ombro_e: "Ombro E",
        toracica: "Torácica", lombar: "Lombar",
        cotovelo_d: "Cotovelo D", cotovelo_e: "Cotovelo E",
        quadril_d: "Quadril D", quadril_e: "Quadril E",
        joelho_d: "Joelho D", joelho_e: "Joelho E",
        tornozelo_d: "Tornozelo D", tornozelo_e: "Tornozelo E"
      };

      let activeRegionsStr = "Nenhuma região com queixa de dor.";
      if (dorMobilidade.regions) {
        if (Array.isArray(dorMobilidade.regions)) {
          if (dorMobilidade.regions.length > 0) {
            activeRegionsStr = dorMobilidade.regions.map((r: string) => labels[r] || r).join(", ");
          }
        } else if (typeof dorMobilidade.regions === "object") {
          const activeList = Object.entries(dorMobilidade.regions)
            .filter(([_, val]) => (val as number) > 0)
            .map(([r, val]) => `${labels[r] || r} (Nível ${val})`);
          if (activeList.length > 0) {
            activeRegionsStr = activeList.join(", ");
          }
        }
      }

      painHtml = `
        <div class="section-title">Dor & Mobilidade</div>
        <div class="grid-3" style="margin-bottom: 10px;">
          <div class="info-block">
            <span class="info-label">Escala de Dor</span>
            <span class="info-val" style="color: ${dorMobilidade.painScale > 4 ? '#ef4444' : '#f59e0b'};">${dorMobilidade.painScale} / 10</span>
          </div>
          <div class="info-block col-span-2">
            <span class="info-label">Regiões Doloridas</span>
            <span class="info-val" style="font-size: 11px; font-weight: 600;">${activeRegionsStr}</span>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom: 20px;">
          <div class="info-block">
            <span class="info-label">Limitações Dinâmicas</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${dorMobilidade.limitations || "Nenhuma limitação relatada."}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Histórico de Mobilidade</span>
            <span class="info-val" style="font-weight: normal; font-size: 12px; color: #4b5563;">${dorMobilidade.history || "Nenhum histórico informado."}</span>
          </div>
        </div>
      `;
    }

    let testsHtml = "";
    if (testesFisicos) {
      const f = testesFisicos.flexibilidade;
      const c = testesFisicos.cardio;
      const fr = testesFisicos.forca;

      testsHtml = `
        <div class="section-title">Testes de Aptidão Física</div>
        <div class="grid-3" style="margin-bottom: 20px;">
          <div class="info-block">
            <span class="info-label">Flexibilidade (Wells)</span>
            <span class="info-val">${f?.wells ? `${f.wells} cm` : "—"}</span>
            ${f?.classification ? `<span style="font-size: 9px; color: #10b981; font-weight: bold; display: block; margin-top: 2px;">${f.classification}</span>` : ""}
          </div>
          <div class="info-block">
            <span class="info-label">Cardiorrespiratório (VO2)</span>
            <span class="info-val">${c?.vo2 ? `${c.vo2} ml/kg/min` : "—"}</span>
            ${c?.testType ? `<span style="font-size: 9px; color: #71717a; font-weight: bold; display: block; margin-top: 2px;">Teste: ${c.testType}</span>` : ""}
          </div>
          <div class="info-block">
            <span class="info-label">Força Máxima (1RM Estimado)</span>
            <span class="info-val">${fr?.rm ? `${fr.rm} kg` : fr?.load ? `${fr.load} kg` : "—"}</span>
            ${fr?.exercise ? `<span style="font-size: 9px; color: #71717a; font-weight: bold; display: block; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fr.exercise} (${fr.reps || 0} reps)</span>` : ""}
          </div>
        </div>
      `;
    }

    let notesHtml = "";
    if (notes) {
      notesHtml = `
        <div class="section-title">Observações e Parecer Geral</div>
        <div class="info-block" style="padding: 15px; margin-bottom: 20px; font-style: italic; background-color: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; font-size: 12px; color: #4b5563;">
          ${notes}
        </div>
      `;
    }

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Avaliação Física - ${workspaceName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            @page {
              margin: 0;
              size: A4;
            }
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 40px 30px;
              color: #18181b;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              box-sizing: border-box;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .top-bar {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 15px;
              background-color: ${primaryColor};
              z-index: 9999;
            }
            .bottom-bar {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 15px;
              background-color: ${primaryColor};
              z-index: 9999;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #f4f4f5;
              padding-bottom: 20px;
              margin-top: 15px;
              margin-bottom: 25px;
            }
            .brand-info {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo {
              width: 45px;
              height: 45px;
              object-fit: cover;
              border-radius: 8px;
            }
            .logo-fallback {
              width: 45px;
              height: 45px;
              background-color: ${primaryColor};
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 20px;
              border-radius: 8px;
            }
            .brand-name {
              font-weight: 900;
              font-size: 18px;
              letter-spacing: -0.5px;
              color: #18181b;
            }
            .doc-title {
              text-align: right;
            }
            .doc-title h1 {
              margin: 0;
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: ${primaryColor};
            }
            .doc-title p {
              margin: 4px 0 0 0;
              font-size: 11px;
              color: #71717a;
              font-weight: 600;
            }
            .section-title {
              font-size: 12px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #4b5563;
              margin-top: 20px;
              margin-bottom: 12px;
              border-left: 3px solid ${primaryColor};
              padding-left: 8px;
              page-break-after: avoid;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              page-break-inside: avoid;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              page-break-inside: avoid;
            }
            .grid-4 {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              page-break-inside: avoid;
            }
            .col-span-2 {
              grid-column: span 2;
            }
            .info-block {
              background-color: #fafafa;
              border: 1px solid #f4f4f5;
              border-radius: 8px;
              padding: 8px 12px;
            }
            .info-label {
              font-size: 8px;
              text-transform: uppercase;
              font-weight: 700;
              color: #71717a;
              letter-spacing: 0.5px;
              display: block;
              margin-bottom: 2px;
            }
            .info-val {
              font-size: 12px;
              font-weight: 700;
              color: #18181b;
            }
            .footer-note {
              margin-top: auto;
              border-top: 1px solid #f4f4f5;
              padding-top: 15px;
              font-size: 10px;
              color: #a1a1aa;
              text-align: center;
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            ${watermarkUrl ? `
            .watermark {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url('${watermarkUrl}');
              background-position: center;
              background-repeat: no-repeat;
              background-size: 60%;
              opacity: 0.06;
              z-index: -1000;
              pointer-events: none;
            }
            ` : ""}
          </style>
        </head>
        <body>
          ${watermarkUrl ? `<div class="watermark"></div>` : ""}
          <div class="top-bar"></div>
          
          <div>
            <div class="header">
              <div class="brand-info">
                ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="${workspaceName}" />` : `<div class="logo-fallback">${workspaceName ? workspaceName.charAt(0).toUpperCase() : "A"}</div>`}
                <div class="brand-name">${workspaceName}</div>
              </div>
              <div class="doc-title">
                <h1>Relatório Físico</h1>
                <p>Avaliação de ${formatDateStr(evaluation.date)}</p>
              </div>
            </div>

            ${anamneseHtml}
            ${compHtml}
            ${circHtml}
            ${foldsHtml}
            ${posturalHtml}
            ${painHtml}
            ${testsHtml}
            ${notesHtml}
          </div>

          <div class="footer-note">
            Relatório gerado automaticamente por ${workspaceName || "AtlasFit"}. Todos os direitos reservados.
          </div>
          
          <div class="bottom-bar"></div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  // Formatting dates helper
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Safe data access
  const weight = evaluation.weight || 0;
  const height = evaluation.height || 0;
  const bodyFat = evaluation.bodyFat || null;
  const muscleMass = evaluation.muscleMass || null;
  const notes = evaluation.notes || "";

  // Structured fields from JSON
  const anamnese = evaluation.anamnese || null;
  const circunferencias = evaluation.circunferencias || null;
  const postural = evaluation.postural || null;
  const dorMobilidade = evaluation.dorMobilidade || null;
  const testesFisicos = evaluation.testesFisicos || null;
  const dobras = evaluation.dobras || null;

  // Calculated values fallback
  const imc = anamnese?.imc || (weight && height ? parseFloat((weight / ((height / 100) * (height / 100))).toFixed(2)) : null);
  const imcClass = anamnese?.imcClassification || (() => {
    if (!imc) return "";
    if (imc < 18.5) return "Abaixo do peso";
    if (imc <= 24.9) return "Peso normal";
    if (imc <= 29.9) return "Sobrepeso";
    if (imc <= 34.9) return "Obesidade Grau I";
    if (imc <= 39.9) return "Obesidade Grau II";
    return "Obesidade Grau III";
  })();

  // J&P 3 folds sum
  const sumFolds = dobras
    ? (parseFloat(dobras.peitoral || dobras.triceps || 0) +
      parseFloat(dobras.abdominal || dobras.suprailiaca || 0) +
      parseFloat(dobras.coxa || 0))
    : 0;

  const fatMass = dobras?.fatMass || (weight && bodyFat ? parseFloat((weight * (bodyFat / 100)).toFixed(2)) : null);
  const leanMass = dobras?.leanMass || (weight && bodyFat ? parseFloat((weight * (1 - bodyFat / 100)).toFixed(2)) : null);
  const bfClass = dobras?.classification || "";

  const tabsConfig = [
    { id: "anamnese", label: "Anamnese", icon: ClipboardCheck, show: true },
    { id: "antropometria", label: "Composição & Perímetros", icon: Ruler, show: true },
    { id: "dobras", label: "Dobras Cutâneas", icon: Flame, show: !!dobras },
    { id: "postural", label: "Alinhamento Postural", icon: Activity, show: !!postural },
    { id: "dor", label: "Dor & Mobilidade", icon: Heart, show: !!dorMobilidade },
    { id: "testes", label: "Testes Físicos", icon: FileText, show: !!testesFisicos }
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="w-full gap-0! max-w-[calc(100%-1.5rem)] md:max-w-4xl bg-card dark:bg-neutral-950 border border-border dark:border-neutral-900 text-foreground max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl p-0">
          {/* Header */}
          <DialogHeader className="p-6 pb-2 border-b border-border dark:border-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider block mb-0.5">Relatório Físico Detalhado</span>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                <ClipboardCheck className="size-5 text-orange-500" />
                Avaliação de {formatDate(evaluation.date)}
              </DialogTitle>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintEvaluation}
                className="border-border dark:border-neutral-850 hover:bg-muted dark:hover:bg-neutral-900 text-xs font-bold rounded-xl h-9 gap-1.5"
              >
                <Printer className="size-4 text-orange-500" />
                <span>Exportar PDF</span>
              </Button>
              <Badge variant="outline" className="bg-muted dark:bg-neutral-900 text-muted-foreground border-border dark:border-neutral-800 text-[10px] font-bold py-1 px-3">
                Tipo: {evaluation.type}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex flex-col md:flex-row min-h-[450px]">
            {/* Nav Menu Left */}
            <div className="md:w-56 border-b md:border-b-0 md:border-r border-border dark:border-neutral-900 bg-muted/10 p-3 space-y-1">
              {tabsConfig.filter(t => t.show).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all text-left whitespace-nowrap md:w-full ${activeTab === t.id
                      ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20"
                      : "text-muted-foreground hover:bg-muted dark:hover:bg-neutral-900"
                      }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable details tab content */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[60vh] md:max-h-[600px] space-y-6">
              {/* --- TAB 1: ANAMNESE --- */}
              {activeTab === "anamnese" && (
                <div className="space-y-4">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <User className="size-4 text-orange-500" /> Histórico Clínico & Anamnese
                    </h3>
                  </div>

                  {anamnese ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Nome</span>
                          <span className="font-extrabold text-foreground text-xs">{anamnese.name}</span>
                        </Card>
                        <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Sexo</span>
                          <span className="font-extrabold text-foreground text-xs">{anamnese.gender === "male" ? "Masculino" : "Feminino"}</span>
                        </Card>
                        <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Nascimento</span>
                          <span className="font-extrabold text-foreground text-xs">{anamnese.birthDate ? new Date(anamnese.birthDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}</span>
                        </Card>
                        <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Nível de Atividade</span>
                          <span className="font-extrabold text-orange-500 text-xs uppercase">{anamnese.activityLevel || "Moderado"}</span>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-muted/40 dark:bg-neutral-900/40 border border-border dark:border-neutral-900 p-3.5 rounded-xl space-y-1">
                          <span className="font-extrabold text-foreground block">Lesões e Dores Musculares</span>
                          <p className="text-muted-foreground font-medium">{anamnese.injuries || "Nenhuma lesão relatada."}</p>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 border border-border dark:border-neutral-900 p-3.5 rounded-xl space-y-1">
                          <span className="font-extrabold text-foreground block">Doenças Clínicas</span>
                          <p className="text-muted-foreground font-medium">{anamnese.illnesses || "Nenhuma doença relatada."}</p>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 border border-border dark:border-neutral-900 p-3.5 rounded-xl space-y-1">
                          <span className="font-extrabold text-foreground block">Uso de Medicamentos</span>
                          <p className="text-muted-foreground font-medium">{anamnese.medications || "Nenhum medicamento relatado."}</p>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 border border-border dark:border-neutral-900 p-3.5 rounded-xl space-y-1">
                          <span className="font-extrabold text-foreground block">Restrições Médicas Específicas</span>
                          <p className="text-muted-foreground font-medium">{anamnese.restrictions || "Nenhuma restrição médica informada."}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3.5 col-span-2 space-y-1">
                          <span className="font-bold text-muted-foreground text-[10px] block uppercase">Hábitos Alimentares</span>
                          <p className="text-foreground font-semibold text-xs">{anamnese.eatingHabits || "Sem detalhes informados."}</p>
                        </Card>
                        <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3.5 space-y-1 flex flex-col justify-center">
                          <span className="font-bold text-muted-foreground text-[10px] block uppercase">Qualidade do Sono</span>
                          <span className="font-extrabold text-emerald-500 uppercase text-xs">{anamnese.sleepQuality || "Boa"}</span>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground">
                      <Info className="size-8 text-neutral-700 mb-2 animate-pulse" />
                      Esta avaliação física é antiga ou não possui ficha de anamnese completa.
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 2: ANTROPOMETRIA & CIRCUNFERÊNCIAS --- */}
              {activeTab === "antropometria" && (
                <div className="space-y-6">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Scale className="size-4 text-orange-500" /> Fatores Antropométricos e Perímetros
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Peso</span>
                      <span className="font-extrabold text-foreground text-sm">{weight} kg</span>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Altura</span>
                      <span className="font-extrabold text-foreground text-sm">{height} cm</span>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">IMC</span>
                      <span className="font-extrabold text-foreground text-sm">{imc || "—"}</span>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3 flex flex-col justify-center">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Classificação IMC</span>
                      <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-450 border border-sky-500/20 font-extrabold text-[9px] py-0 px-2 rounded-full w-fit">
                        {imcClass || "—"}
                      </Badge>
                    </Card>
                  </div>

                  {circunferencias ? (
                    <div className="space-y-4">
                      <span className="text-xs font-extrabold text-foreground uppercase tracking-wider block px-1">Tabela de Circunferências Corporais</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Peitoral</span>
                          <span className="font-bold text-foreground">{circunferencias.chest ? `${circunferencias.chest} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Cintura</span>
                          <span className="font-bold text-foreground">{circunferencias.waist ? `${circunferencias.waist} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Abdômen</span>
                          <span className="font-bold text-foreground">{circunferencias.abdomen ? `${circunferencias.abdomen} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Quadril</span>
                          <span className="font-bold text-foreground">{circunferencias.hips ? `${circunferencias.hips} cm` : "—"}</span>
                        </div>

                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Braço Relax. D</span>
                          <span className="font-bold text-foreground">{circunferencias.rightArmRelaxed ? `${circunferencias.rightArmRelaxed} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Braço Relax. E</span>
                          <span className="font-bold text-foreground">{circunferencias.leftArmRelaxed ? `${circunferencias.leftArmRelaxed} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Braço Contr. D</span>
                          <span className="font-bold text-foreground">{circunferencias.rightArmContracted ? `${circunferencias.rightArmContracted} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Braço Contr. E</span>
                          <span className="font-bold text-foreground">{circunferencias.leftArmContracted ? `${circunferencias.leftArmContracted} cm` : "—"}</span>
                        </div>

                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Coxa Direita</span>
                          <span className="font-bold text-foreground">{circunferencias.rightThigh ? `${circunferencias.rightThigh} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Coxa Esquerda</span>
                          <span className="font-bold text-foreground">{circunferencias.leftThigh ? `${circunferencias.leftThigh} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Panturrilha D</span>
                          <span className="font-bold text-foreground">{circunferencias.rightCalf ? `${circunferencias.rightCalf} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900 text-xs">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Panturrilha E</span>
                          <span className="font-bold text-foreground">{circunferencias.leftCalf ? `${circunferencias.leftCalf} cm` : "—"}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/10 p-4 rounded-xl text-center text-xs text-muted-foreground border border-border dark:border-neutral-900">
                      Nenhum perímetro/circunferência corporal cadastrado para esta avaliação.
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 3: DOBRAS CUTÂNEAS --- */}
              {activeTab === "dobras" && dobras && (
                <div className="space-y-6">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Flame className="size-4 text-orange-500" /> Dobras Cutâneas Pollock
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Percentual Gordura</span>
                      <span className="font-extrabold text-rose-500 text-sm">{bodyFat}%</span>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Massa Gorda</span>
                      <span className="font-extrabold text-foreground text-sm">{fatMass} kg</span>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Massa Magra</span>
                      <span className="font-extrabold text-emerald-500 text-sm">{leanMass} kg</span>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3 flex flex-col justify-center">
                      <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Classificação Corporal</span>
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-extrabold text-[9px] py-0 px-2 rounded-full w-fit">
                        {bfClass || "Normal"}
                      </Badge>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border/30 dark:border-neutral-900 pb-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Dobras Registradas</span>
                      <span className="text-[10px] text-muted-foreground">Soma das Dobras: <strong>{sumFolds.toFixed(1)} mm</strong></span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {dobras.peitoral !== undefined && (
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Peitoral</span>
                          <span className="font-bold text-foreground">{dobras.peitoral} mm</span>
                        </div>
                      )}
                      {dobras.abdominal !== undefined && (
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Abdominal</span>
                          <span className="font-bold text-foreground">{dobras.abdominal} mm</span>
                        </div>
                      )}
                      {dobras.triceps !== undefined && (
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Tricipital</span>
                          <span className="font-bold text-foreground">{dobras.triceps} mm</span>
                        </div>
                      )}
                      {dobras.suprailiaca !== undefined && (
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Suprailíaca</span>
                          <span className="font-bold text-foreground">{dobras.suprailiaca} mm</span>
                        </div>
                      )}
                      {dobras.coxa !== undefined && (
                        <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                          <span className="text-[9px] text-muted-foreground block uppercase font-bold">Coxa</span>
                          <span className="font-bold text-foreground">{dobras.coxa} mm</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* --- TAB 4: AVALIAÇÃO POSTURAL --- */}
              {activeTab === "postural" && postural && (
                <div className="space-y-6">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Activity className="size-4 text-orange-500" /> Relatório Postural
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(postural.photos || {}).map(([view, url]) => {
                      if (!url) return null;
                      const label = view === "frontal" ? "Frontal" : view === "posterior" ? "Posterior" : view === "lateralRight" ? "Lateral Direita" : "Lateral Esquerda";
                      return (
                        <div key={view} className="relative group border border-border dark:border-neutral-900 rounded-xl overflow-hidden bg-neutral-900 h-32 flex flex-col justify-end">
                          <img src={url as string} className="size-full object-cover absolute inset-0" alt={label} />
                          <div className="bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent p-2 absolute inset-x-0 bottom-0 flex justify-between items-center z-10">
                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">{label}</span>
                            <button
                              type="button"
                              onClick={() => setLightboxPhoto(url as string)}
                              className="text-white hover:text-orange-500 transition-colors p-1"
                              title="Expandir foto"
                            >
                              <Maximize2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-extrabold text-foreground uppercase tracking-wider block px-1">Alinhamento das Articulações</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold">Cabeça</span>
                        <span className="font-semibold text-foreground">{postural.cabeca || "Normal"}</span>
                      </div>
                      <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold">Ombros</span>
                        <span className="font-semibold text-foreground">{postural.ombros || "Normal"}</span>
                      </div>
                      <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold">Quadril</span>
                        <span className="font-semibold text-foreground">{postural.quadril || "Normal"}</span>
                      </div>
                      <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold">Joelhos</span>
                        <span className="font-semibold text-foreground">{postural.joelhos || "Normal"}</span>
                      </div>
                      <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold">Tornozelos</span>
                        <span className="font-semibold text-foreground">{postural.tornozelos || "Normal"}</span>
                      </div>
                      <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-xl border border-border dark:border-neutral-900">
                        <span className="text-[9px] text-muted-foreground block uppercase font-bold">Coluna</span>
                        <span className="font-semibold text-foreground">{postural.coluna || "Normal"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3.5 space-y-1">
                      <span className="font-bold text-muted-foreground text-[10px] block uppercase">Desvios Posturais Encontrados</span>
                      <p className="text-foreground font-semibold text-xs">{postural.deviations || "Nenhum desvio crítico apontado."}</p>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3.5 space-y-1">
                      <span className="font-bold text-muted-foreground text-[10px] block uppercase">Recomendações e Laudo</span>
                      <p className="text-foreground font-semibold text-xs">{postural.report || "Sem recomendações específicas."}</p>
                    </Card>
                  </div>
                </div>
              )}

              {/* --- TAB 5: DOR & MOBILIDADE --- */}
              {activeTab === "dor" && dorMobilidade && (
                <div className="space-y-6">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Heart className="size-4 text-orange-500" /> Relatório de Dor & Limitações de Movimento
                    </h3>
                  </div>

                  <div className="bg-muted/30 dark:bg-neutral-900/30 border border-border dark:border-neutral-900 p-4 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Escala Analógica de Dor</span>
                      <span className="font-extrabold text-foreground text-sm">{dorMobilidade.painScale} / 10</span>
                    </div>
                    <Badge className={`font-bold px-3 py-1 rounded-full text-xs ${dorMobilidade.painScale === 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : dorMobilidade.painScale <= 4
                        ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-455"
                      }`}>
                      {dorMobilidade.painScale === 0 ? "Sem Dor" : dorMobilidade.painScale <= 4 ? "Dor Leve" : dorMobilidade.painScale <= 7 ? "Dor Moderada" : "Dor Aguda / Severa"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs font-extrabold text-foreground uppercase tracking-wider block px-1">Foco e Regiões Doloridas</span>
                    {dorMobilidade.regions ? (
                      (() => {
                        const labels: Record<string, string> = {
                          cervical: "Cervical", ombro_d: "Ombro Direito", ombro_e: "Ombro Esquerdo",
                          toracica: "Coluna Torácica", lombar: "Coluna Lombar",
                          cotovelo_d: "Cotovelo Direito", cotovelo_e: "Cotovelo Esquerdo",
                          quadril_d: "Quadril Direito", quadril_e: "Quadril Esquerdo",
                          joelho_d: "Joelho Direito", joelho_e: "Joelho Esquerdo",
                          tornozelo_d: "Tornozelo Direito", tornozelo_e: "Tornozelo Esquerdo"
                        };

                        if (Array.isArray(dorMobilidade.regions)) {
                          if (dorMobilidade.regions.length === 0) {
                            return <p className="text-xs text-muted-foreground italic px-1">Nenhuma região com queixa de dor reportada.</p>;
                          }
                          return (
                            <div className="flex flex-wrap gap-2">
                              {dorMobilidade.regions.map((regionId: string) => (
                                <Badge key={regionId} className="bg-rose-500/10 text-rose-500 border border-rose-500/25 px-2.5 py-0.5 font-bold text-xs rounded-lg">
                                  {labels[regionId] || regionId}
                                </Badge>
                              ))}
                            </div>
                          );
                        } else if (typeof dorMobilidade.regions === "object") {
                          const activeRegions = Object.entries(dorMobilidade.regions).filter(([_, val]) => (val as number) > 0);
                          if (activeRegions.length === 0) {
                            return <p className="text-xs text-muted-foreground italic px-1">Nenhuma região com queixa de dor reportada.</p>;
                          }
                          return (
                            <div className="flex flex-wrap gap-2">
                              {activeRegions.map(([regionId, val]) => (
                                <Badge key={regionId} className="bg-rose-500/10 text-rose-500 border border-rose-500/25 px-2.5 py-0.5 font-bold text-xs rounded-lg flex items-center gap-1.5">
                                  <span>{labels[regionId] || regionId}</span>
                                  <span className="h-1.5 w-1.5 bg-rose-500 rounded-full" />
                                  <span className="text-[10px] font-black text-rose-400">Nível {val as number}/10</span>
                                </Badge>
                              ))}
                            </div>
                          );
                        }
                        return <p className="text-xs text-muted-foreground italic px-1">Nenhuma região com queixa de dor reportada.</p>;
                      })()
                    ) : (
                      <p className="text-xs text-muted-foreground italic px-1">Nenhuma região com queixa de dor reportada.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3.5 space-y-1">
                      <span className="font-bold text-muted-foreground text-[10px] block uppercase">Limitações Dinâmicas</span>
                      <p className="text-foreground font-semibold text-xs">{dorMobilidade.limitations || "Nenhuma limitação relatada."}</p>
                    </Card>
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-3.5 space-y-1">
                      <span className="font-bold text-muted-foreground text-[10px] block uppercase">Histórico e Observações de Mobilidade</span>
                      <p className="text-foreground font-semibold text-xs">{dorMobilidade.history || "Nenhum histórico informado."}</p>
                    </Card>
                  </div>
                </div>
              )}

              {/* --- TAB 6: TESTES FÍSICOS --- */}
              {activeTab === "testes" && testesFisicos && (
                <div className="space-y-6">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <FileText className="size-4 text-orange-500" /> Resultados dos Testes de Aptidão Física
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {/* Flexibilidade */}
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-4 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Flexibilidade</span>
                        <span className="font-extrabold text-foreground text-sm">
                          {testesFisicos.flexibilidade?.wells ? `${testesFisicos.flexibilidade.wells} cm` : "—"}
                        </span>
                      </div>
                      {testesFisicos.flexibilidade?.classification && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 font-bold text-[9px] py-0 px-2 rounded w-fit">
                          {testesFisicos.flexibilidade.classification}
                        </Badge>
                      )}
                    </Card>

                    {/* Resistência Cardio */}
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-4 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Cardiorrespiratório</span>
                        <span className="font-extrabold text-foreground text-sm">
                          {testesFisicos.cardio?.vo2 ? `${testesFisicos.cardio.vo2} ml/kg/min` : "—"}
                        </span>
                      </div>
                      {testesFisicos.cardio?.testType && (
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          Teste: {testesFisicos.cardio.testType}
                        </span>
                      )}
                    </Card>

                    {/* Teste de Força */}
                    <Card className="border border-border/50 dark:border-neutral-900 bg-muted/20 p-4 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Força Máxima (1RM)</span>
                        <span className="font-extrabold text-foreground text-sm">
                          {testesFisicos.forca?.rm ? `${testesFisicos.forca.rm} kg` : testesFisicos.forca?.load ? `${testesFisicos.forca.load} kg` : "—"}
                        </span>
                      </div>
                      {testesFisicos.forca?.exercise && (
                        <span className="text-[10px] text-muted-foreground font-medium block truncate" title={testesFisicos.forca.exercise}>
                          {testesFisicos.forca.exercise} ({testesFisicos.forca.reps || 0} reps)
                        </span>
                      )}
                    </Card>
                  </div>
                </div>
              )}

              {/* General Observations notes at bottom of all tabs */}
              {notes && (
                <div className="space-y-2 border-t border-border/40 dark:border-neutral-900/60 pt-4 text-xs">
                  <span className="font-extrabold text-foreground block">Observações e Parecer Técnico Geral:</span>
                  <div className="p-3.5 bg-neutral-900/30 border border-border dark:border-neutral-900 rounded-xl text-muted-foreground italic font-medium whitespace-pre-wrap leading-relaxed">
                    "{notes}"
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border dark:border-neutral-900 bg-muted/10">
            <Button
              type="button"
              variant="outline"
              className="border-border dark:border-neutral-800 hover:bg-muted dark:hover:bg-neutral-900 text-xs font-bold rounded-xl h-10 w-full sm:w-auto"
              onClick={onClose}
            >
              Fechar Visualização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Postural Image Lightbox Dialog */}
      <Dialog open={!!lightboxPhoto} onOpenChange={(val) => !val && setLightboxPhoto(null)}>
        <DialogContent className="max-w-3xl bg-neutral-950 border border-neutral-900 p-2 rounded-2xl flex items-center justify-center overflow-hidden">
          {lightboxPhoto && (
            <div className="relative w-full max-h-[85vh] flex items-center justify-center">
              <img src={lightboxPhoto} className="max-w-full max-h-[80vh] object-contain rounded-xl" alt="Postural expanded view" />
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-3 right-3 bg-neutral-900/90 text-white rounded-full p-2 border border-white/10 hover:bg-neutral-800 transition-colors"
                title="Fechar ampliação"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
