import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Boxes, ShieldAlert, GraduationCap, Building2,
  Database, FileText, ListChecks, BookOpenCheck, Eye, Gauge,
  BadgeCheck, FileCheck2, Landmark, Wrench,
  ShieldCheck, Scale, UsersRound, Clock8, HandHeart,
  MessageSquareWarning, Bot, RadioTower, AlertTriangle,
  Search, Users, TableProperties, Coins,
  Sparkles, HelpCircle,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "AI System Inventory", href: "/systems", icon: Boxes },
      { label: "Classification & Screening", href: "/classification", icon: ShieldAlert },
      { label: "AI Literacy Program", href: "/literacy", icon: GraduationCap },
      { label: "Governance & Authority Map", href: "/governance", icon: Building2 },
    ],
  },
  {
    label: "Provider Obligations",
    items: [
      { label: "Risk Management", href: "/provider/risk-management", icon: ShieldAlert },
      { label: "Data Governance", href: "/provider/data-governance", icon: Database },
      { label: "Technical Documentation", href: "/provider/technical-documentation", icon: FileText },
      { label: "Record-Keeping", href: "/provider/record-keeping", icon: ListChecks },
      { label: "Instructions for Use", href: "/provider/transparency-instructions", icon: BookOpenCheck },
      { label: "Human Oversight (Design)", href: "/provider/human-oversight-design", icon: Eye },
      { label: "Accuracy, Robustness & Cyber", href: "/provider/accuracy-robustness-cyber", icon: Gauge },
      { label: "Quality Management System", href: "/provider/qms", icon: BadgeCheck },
      { label: "Conformity Assessment", href: "/provider/conformity-assessment", icon: FileCheck2 },
      { label: "EU Database Registration", href: "/provider/eu-database", icon: Landmark },
      { label: "Corrective Actions", href: "/provider/corrective-actions", icon: Wrench },
    ],
  },
  {
    label: "Deployer Obligations",
    items: [
      { label: "Obligation Checklist", href: "/deployer/obligations", icon: ShieldCheck },
      { label: "FRIA", href: "/deployer/fria", icon: Scale },
      { label: "Human Oversight (Operation)", href: "/deployer/human-oversight-operation", icon: UsersRound },
      { label: "Logs & Retention", href: "/deployer/logs", icon: Clock8 },
      { label: "Individual Rights & Remedies", href: "/deployer/individual-rights", icon: HandHeart },
    ],
  },
  {
    label: "Cross-Cutting Operations",
    items: [
      { label: "Transparency (Certain Systems)", href: "/operations/transparency-certain-systems", icon: MessageSquareWarning },
      { label: "GPAI Downstream Integration", href: "/operations/gpai-integration", icon: Bot },
      { label: "Post-Market Monitoring", href: "/operations/post-market-monitoring", icon: RadioTower },
      { label: "Serious Incident Reporting", href: "/operations/incidents", icon: AlertTriangle },
    ],
  },
  {
    label: "Assurance & Reporting",
    items: [
      { label: "Internal Audit", href: "/assurance/internal-audit", icon: Search },
      { label: "Management Review", href: "/assurance/management-review", icon: Users },
      { label: "Obligations Matrix", href: "/assurance/obligations-matrix", icon: TableProperties },
      { label: "Penalty Exposure", href: "/assurance/penalties-exposure", icon: Coins },
    ],
  },
  {
    label: "Agentic Layer",
    items: [
      { label: "Agent Runs & Proposals", href: "/agents", icon: Sparkles },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "Help Center", href: "/help", icon: HelpCircle },
    ],
  },
];
