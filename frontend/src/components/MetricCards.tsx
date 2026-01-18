import React from "react";
import {
    Activity,
    Box,
    RefreshCcw,
    Star,
    Clock,
    AlertTriangle,
    XOctagon,
    Lock
} from "lucide-react";

export type Metrics = {
    active_sourcing: number;
    concept_items: number;
    revenue_recovery: number;
    engagement: number;
    zone_fresh: number;
    zone_watch: number;
    zone_dead: number;
    zone_reserved: number;
};

interface CardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    theme: string;
}

function StatCard({ label, value, icon, theme }: CardProps) {
    return (
        <div className={`stat-card theme-${theme}`}>
            <div className="stat-header">
                <div className="stat-icon">
                    {icon}
                </div>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

export default function MetricCards({ m }: { m: Metrics }) {
    return (
        <div className="dashboard-grid">
            <StatCard
                label="Active Sourcing (Fresh)"
                value={m.active_sourcing}
                icon={<Activity size={24} />}
                theme="green"
            />
            <StatCard
                label="Concept Items"
                value={m.concept_items}
                icon={<Box size={24} />}
                theme="purple"
            />
            <StatCard
                label="Revenue Recovery"
                value={m.revenue_recovery}
                icon={<RefreshCcw size={24} />}
                theme="gold"
            />
            <StatCard
                label="Avg Engagement"
                value={m.engagement}
                icon={<Star size={24} />}
                theme="blue"
            />

            {/* Zone Stats */}
            <StatCard
                label="Fresh Zone"
                value={m.zone_fresh}
                icon={<Clock size={24} />}
                theme="green"
            />
            <StatCard
                label="Watch Zone"
                value={m.zone_watch}
                icon={<AlertTriangle size={24} />}
                theme="orange"
            />
            <StatCard
                label="Dead Zone"
                value={m.zone_dead}
                icon={<XOctagon size={24} />}
                theme="red"
            />
            <StatCard
                label="Reserved"
                value={m.zone_reserved}
                icon={<Lock size={24} />}
                theme="gold"
            />
        </div>
    );
}
