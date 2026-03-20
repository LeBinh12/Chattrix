# -*- coding: utf-8 -*-
import os
import glob
import json

def read_log(filepath):
    if not filepath or not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r') as f:
            return [float(line.strip()) for line in f if line.strip()]
    except:
        return []

def generate_dashboard(log_dir, output_path):
    scenarios = [
        {'users': 500, 'suffix': '500u'},
        {'users': 2000, 'suffix': '2000u'},
        {'users': 5000, 'suffix': '5000u'}
    ]

    panel_data = []

    for sc in scenarios:
        cpu_files = glob.glob(os.path.join(log_dir, f"cpu_{sc['suffix']}_*.log"))
        ram_files = glob.glob(os.path.join(log_dir, f"ram_{sc['suffix']}_*.log"))
        
        cpu_path = max(cpu_files, key=os.path.getctime) if cpu_files else None
        ram_path = max(ram_files, key=os.path.getctime) if ram_files else None

        cpu_data = read_log(cpu_path)
        ram_data = read_log(ram_path)
        
        if not cpu_data or not ram_data:
            continue

        min_len = min(len(cpu_data), len(ram_data))
        cpu_data = cpu_data[:min_len]
        ram_data = ram_data[:min_len]

        avg_cpu = sum(cpu_data) / len(cpu_data) if cpu_data else 0
        avg_ram = sum(ram_data) / len(ram_data) if ram_data else 0
        
        d_min = min_len // 60
        d_sec = min_len % 60
        duration_str = f"{d_min}m {d_sec}s" if d_min > 0 else f"{d_sec}s"

        panel_data.append({
            'users': sc['users'],
            'duration': duration_str,
            'avg_cpu': f"{avg_cpu:.1f}",
            'avg_ram': f"{avg_ram:.0f}",
            'cpu': cpu_data,
            'ram': ram_data,
            'labels': list(range(min_len))
        })

    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Stability Dashboard</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
    <style>
        :root {
            --color-text-primary: #2c3e50;
            --color-text-secondary: #7f8c8d;
            --color-cpu: #378ADD;
            --color-ram: #E24B4A;
            --bg-panel: #ffffff;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #f8f9fa;
            color: var(--color-text-primary);
            margin: 0;
            padding: 24px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .shared-legend {
            display: flex;
            gap: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .indicator {
            width: 32px;
            height: 3px;
            border-radius: 2px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        .panel {
            background: var(--bg-panel);
            padding: 20px;
            border-radius: 8px;
        }
        .panel-title {
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--color-text-primary);
        }
        .chart-container {
            position: relative;
            height: 220px;
            width: 100%;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 16px;
            font-size: 14px;
            font-weight: 600;
        }
        .stat-cpu { color: var(--color-cpu); }
        .stat-ram { color: var(--color-ram); }
    </style>
</head>
<body>
    <div class="header">
        <h1>Stability Analysis</h1>
        <div class="shared-legend">
            <div class="legend-item">
                <div class="indicator" style="background: var(--color-cpu);"></div>
                <span>CPU %</span>
            </div>
            <div class="legend-item">
                <div class="indicator" style="background: var(--color-ram);"></div>
                <span>RAM (MB)</span>
            </div>
        </div>
    </div>

    <div class="grid">
        {panels_html}
    </div>

    <script>
        const data = {data_js};
        
        function initChart(canvasId, scenario) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: scenario.labels,
                    datasets: [
                        {
                            label: 'CPU %',
                            data: scenario.cpu,
                            borderColor: '#378ADD',
                            borderWidth: 2,
                            yAxisID: 'y1',
                            tension: 0.3,
                            pointRadius: 0
                        },
                        {
                            label: 'RAM (MB)',
                            data: scenario.ram,
                            borderColor: '#E24B4A',
                            borderWidth: 2,
                            yAxisID: 'y2',
                            tension: 0.3,
                            pointRadius: 0
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#2c3e50',
                            bodyColor: '#2c3e50',
                            borderColor: '#e0e0e0',
                            borderWidth: 1,
                            padding: 10,
                            bodyFont: { weight: 'bold' }
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            grid: { display: false },
                            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            min: 0,
                            max: 100,
                            title: { display: true, text: 'CPU %', font: { weight: 'bold' } },
                            grid: { color: 'rgba(0, 0, 0, 0.08)' }
                        },
                        y2: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'RAM (MB)', font: { weight: 'bold' } },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });
        }

        data.forEach((sc, idx) => {
            initChart(`chart-${idx}`, sc);
        });
    </script>
</body>
</html>
"""

    panels_html = ""
    for i, sc in enumerate(panel_data):
        panels_html += f"""
        <div class="panel">
            <div class="panel-title">{sc['users']} users — {sc['duration']}</div>
            <div class="chart-container">
                <canvas id="chart-{i}"></canvas>
            </div>
            <div class="stats">
                <span class="stat-cpu">avg CPU: {sc['avg_cpu']}%</span>
                <span class="stat-ram">avg RAM: {sc['avg_ram']} MB</span>
            </div>
        </div>
        """

    final_html = html_template.replace("{panels_html}", panels_html).replace("{data_js}", json.dumps(panel_data))
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_html)
    
    print(f"Interactive dashboard generated: {output_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    log_dir = os.path.join(project_root, "test_logs")
    output_html = os.path.join(log_dir, "stability_dashboard.html")
    generate_dashboard(log_dir, output_html)
