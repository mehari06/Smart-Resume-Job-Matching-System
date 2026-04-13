'use client';
import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function AnalyticsCharts({ roleData, monthData }: { roleData: any, monthData: any }) {
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981'];

  return (
    <div className="flex flex-col md:flex-row gap-8 justify-around items-center">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-medium text-gray-700 mb-4">User Roles Distribution</h3>
        <PieChart width={300} height={300}>
          <Pie
            data={roleData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {roleData.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

      <div className="flex flex-col items-center mt-8 md:mt-0">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Activity This Month</h3>
        <BarChart
          width={400}
          height={300}
          data={monthData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Jobs" fill="#8884d8" />
          <Bar dataKey="Applications" fill="#82ca9d" />
        </BarChart>
      </div>
    </div>
  );
}
