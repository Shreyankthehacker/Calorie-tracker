import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { landingDemo } from './landing-demo-data';

export function LandingWeekChart({ height = 220 }: { height?: number }) {
  return (
    <div className="lp-chart" style={{ minHeight: height }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={landingDemo.week} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E7E3DD" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#7A756E' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: '#FCFAF6',
              border: '1px solid #DDD6CB',
              fontSize: 13,
            }}
          />
          <Line type="monotone" dataKey="kcal" stroke="#A8112A" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
