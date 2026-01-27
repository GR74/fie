"use client";

import { useRef } from "react";
import { Printer, FileText, Download } from "lucide-react";

interface RunbookData {
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    date: string;
    venue: string;
    capacity: number;
  };
  scenario: {
    attendance: number;
    studentRatio: number;
    crowdEnergy: number;
    standsOpen: number;
    staffPerStand: number;
    expressLanes: boolean;
  };
  projections: {
    winProbability: number;
    decibels: number;
    revenueTotal: number;
    revenuePerCap: number;
    grossMargin: number;
  };
  operations: {
    standsOpen: number;
    standsTotal: number;
    worstUtilization: number;
    recommendedStaff: number;
    waitTimes: Array<{
      window: string;
      waitBand: [number, number];
      utilization: number;
    }>;
  };
}

interface PrintRunbookProps {
  data: RunbookData;
  className?: string;
}

export function PrintRunbook({ data, className = "" }: PrintRunbookProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Game Day Runbook - ${data.game.homeTeam} vs ${data.game.awayTeam}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              max-width: 8.5in;
              margin: 0 auto;
              color: #1a1a1a;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #bb0000;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 { font-size: 28px; color: #bb0000; margin-bottom: 8px; }
            .header .subtitle { font-size: 14px; color: #666; }
            .header .matchup { font-size: 20px; margin-top: 12px; }
            .section {
              margin-bottom: 24px;
            }
            .section h2 {
              font-size: 16px;
              color: #bb0000;
              border-bottom: 1px solid #ddd;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
            }
            .grid-3 {
              grid-template-columns: repeat(3, 1fr);
            }
            .stat-box {
              background: #f5f5f5;
              padding: 16px;
              border-radius: 8px;
              text-align: center;
            }
            .stat-box .label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .stat-box .value {
              font-size: 24px;
              font-weight: bold;
              margin-top: 4px;
            }
            .stat-box .value.highlight { color: #bb0000; }
            .stat-box .value.success { color: #22c55e; }
            .stat-box .value.warning { color: #f59e0b; }
            .stat-box .value.danger { color: #ef4444; }
            .table {
              width: 100%;
              border-collapse: collapse;
            }
            .table th, .table td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #eee;
            }
            .table th {
              background: #f5f5f5;
              font-size: 12px;
              text-transform: uppercase;
              color: #666;
            }
            .checklist {
              list-style: none;
            }
            .checklist li {
              padding: 8px 0;
              border-bottom: 1px solid #eee;
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .checklist li::before {
              content: "☐";
              font-size: 18px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GAME DAY OPERATIONS RUNBOOK</h1>
            <div class="matchup">${data.game.awayTeam} @ ${data.game.homeTeam}</div>
            <div class="subtitle">${data.game.venue} • ${data.game.date}</div>
          </div>

          <div class="section">
            <h2>Key Projections</h2>
            <div class="grid grid-3">
              <div class="stat-box">
                <div class="label">Win Probability</div>
                <div class="value highlight">${(data.projections.winProbability * 100).toFixed(1)}%</div>
              </div>
              <div class="stat-box">
                <div class="label">Crowd Noise</div>
                <div class="value">${data.projections.decibels.toFixed(1)} dB</div>
              </div>
              <div class="stat-box">
                <div class="label">Revenue Projection</div>
                <div class="value success">$${(data.projections.revenueTotal / 1000000).toFixed(2)}M</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Scenario Configuration</h2>
            <div class="grid">
              <div class="stat-box">
                <div class="label">Expected Attendance</div>
                <div class="value">${data.scenario.attendance.toLocaleString()}</div>
              </div>
              <div class="stat-box">
                <div class="label">Student Section %</div>
                <div class="value">${(data.scenario.studentRatio * 100).toFixed(1)}%</div>
              </div>
              <div class="stat-box">
                <div class="label">Crowd Energy Index</div>
                <div class="value">${data.scenario.crowdEnergy}/100</div>
              </div>
              <div class="stat-box">
                <div class="label">Express Lanes</div>
                <div class="value">${data.scenario.expressLanes ? "ENABLED" : "DISABLED"}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Concessions Operations</h2>
            <div class="grid" style="margin-bottom: 16px;">
              <div class="stat-box">
                <div class="label">Stands Open</div>
                <div class="value">${data.operations.standsOpen} / ${data.operations.standsTotal}</div>
              </div>
              <div class="stat-box">
                <div class="label">Staff Per Stand</div>
                <div class="value">${data.scenario.staffPerStand}</div>
              </div>
              <div class="stat-box">
                <div class="label">Worst Utilization</div>
                <div class="value ${data.operations.worstUtilization > 1 ? 'danger' : data.operations.worstUtilization > 0.9 ? 'warning' : 'success'}">
                  ${(data.operations.worstUtilization * 100).toFixed(0)}%
                </div>
              </div>
              <div class="stat-box">
                <div class="label">Recommended Staff</div>
                <div class="value">${data.operations.recommendedStaff}/stand</div>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Time Window</th>
                  <th>Expected Wait</th>
                  <th>Utilization</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.operations.waitTimes.map(wt => `
                  <tr>
                    <td>${wt.window === 'pre_kick' ? 'Pre-Game' : wt.window === 'halftime' ? 'Halftime' : 'Q4'}</td>
                    <td>${wt.waitBand[0]}-${wt.waitBand[1]} min</td>
                    <td>${(wt.utilization * 100).toFixed(0)}%</td>
                    <td style="color: ${wt.utilization > 1 ? '#ef4444' : wt.utilization > 0.9 ? '#f59e0b' : '#22c55e'}">
                      ${wt.utilization > 1 ? '⚠️ CRITICAL' : wt.utilization > 0.9 ? '⚡ HIGH' : '✅ NORMAL'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Pre-Game Checklist</h2>
            <ul class="checklist">
              <li>Verify all ${data.operations.standsOpen} concession stands are staffed with ${data.scenario.staffPerStand} employees</li>
              <li>Confirm ${data.scenario.expressLanes ? 'express lanes are operational' : 'standard lane configuration'}</li>
              <li>Test audio system for ${data.projections.decibels.toFixed(0)}+ dB capacity</li>
              <li>Brief security on expected crowd of ${data.scenario.attendance.toLocaleString()}</li>
              <li>Position additional staff for halftime surge (${(data.operations.worstUtilization * 100).toFixed(0)}% projected utilization)</li>
              <li>Coordinate with student section leaders (${(data.scenario.studentRatio * 100).toFixed(0)}% student attendance)</li>
              <li>Review emergency protocols with operations team</li>
            </ul>
          </div>

          <div class="section">
            <h2>Revenue Summary</h2>
            <div class="grid grid-3">
              <div class="stat-box">
                <div class="label">Total Revenue</div>
                <div class="value success">$${(data.projections.revenueTotal / 1000000).toFixed(2)}M</div>
              </div>
              <div class="stat-box">
                <div class="label">Per-Cap Spend</div>
                <div class="value">$${data.projections.revenuePerCap.toFixed(2)}</div>
              </div>
              <div class="stat-box">
                <div class="label">Gross Margin</div>
                <div class="value success">$${(data.projections.grossMargin / 1000).toFixed(0)}K</div>
              </div>
            </div>
          </div>

          <div class="footer">
            Generated by Fan Impact Engine • ${new Date().toLocaleString()}<br>
            This runbook is based on simulated projections and should be validated with actual operational data.
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className={className}>
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition bg-white/10 hover:bg-white/15 border border-white/10"
      >
        <Printer className="w-4 h-4" />
        Print Runbook
      </button>

      {/* Hidden preview for debugging */}
      <div ref={printRef} className="hidden" />
    </div>
  );
}

// Quick export button that generates runbook from current data
interface QuickRunbookButtonProps {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  capacity: number;
  attendance: number;
  studentRatio: number;
  crowdEnergy: number;
  standsOpen: number;
  staffPerStand: number;
  expressLanes: boolean;
  winProbability: number;
  decibels: number;
  revenueTotal: number;
  revenuePerCap: number;
  grossMargin: number;
  worstUtilization: number;
  recommendedStaff: number;
  waitTimes: Array<{
    window: string;
    waitBand: [number, number];
    utilization: number;
  }>;
  className?: string;
}

export function QuickRunbookButton(props: QuickRunbookButtonProps) {
  const data: RunbookData = {
    game: {
      id: props.gameId,
      homeTeam: props.homeTeam,
      awayTeam: props.awayTeam,
      date: new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      venue: props.venue,
      capacity: props.capacity,
    },
    scenario: {
      attendance: props.attendance,
      studentRatio: props.studentRatio,
      crowdEnergy: props.crowdEnergy,
      standsOpen: props.standsOpen,
      staffPerStand: props.staffPerStand,
      expressLanes: props.expressLanes,
    },
    projections: {
      winProbability: props.winProbability,
      decibels: props.decibels,
      revenueTotal: props.revenueTotal,
      revenuePerCap: props.revenuePerCap,
      grossMargin: props.grossMargin,
    },
    operations: {
      standsOpen: props.standsOpen,
      standsTotal: 65, // Default
      worstUtilization: props.worstUtilization,
      recommendedStaff: props.recommendedStaff,
      waitTimes: props.waitTimes,
    },
  };

  return <PrintRunbook data={data} className={props.className} />;
}

