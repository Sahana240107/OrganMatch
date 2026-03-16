export default function KPICard({ label, value, sub, trend, trendDir = 'up', color = 'green' }) {
    return (
        <div className={`kpi-card ${color}`}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
            {(sub || trend) && (
                <div className="kpi-sub flex items-center gap-4">
                    {trend && <span className={`kpi-trend ${trendDir}`}>{trend}</span>}
                    {sub && <span>{sub}</span>}
                </div>
            )}
        </div>
    )
}