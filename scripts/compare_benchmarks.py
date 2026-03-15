import matplotlib.pyplot as plt
import numpy as np
import json
import os

# Base directory for the project
BASE_DIR = r'e:\Cá nhân\KhoaLuan'

# Paths to the report files provided by the user
report_files = [
    os.path.join(BASE_DIR, r'clientapp\src\components\testing\report_500u_1773420031104.json'),
    os.path.join(BASE_DIR, r'clientapp\src\components\testing\report_1000u_1773422998106.json'),
    os.path.join(BASE_DIR, r'clientapp\src\components\testing\report_2000u_1773423543868.json'),
    os.path.join(BASE_DIR, r'clientapp\src\components\testing\report_5000u_1773425215047.json')
]

def load_report_data(file_paths):
    labels = []
    throughput = []
    memory = []
    cpu = []
    success_rate = []
    
    print(f"Loading data from {len(file_paths)} reports...")
    for path in file_paths:
        if not os.path.exists(path):
            print(f"Error: File not found at {path}")
            continue
            
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            config = data['config']
            stats = data['stats']
            
            target_users = config['target_users']
            if target_users >= 1000:
                label = f"{target_users // 1000}k Users"
            else:
                label = f"{target_users} Users"
            labels.append(label)
            throughput.append(stats['messages_per_sec'])
            memory.append(stats['memory_mb'])
            cpu.append(stats['cpu_usage_percent'])
            
            # Calculate success rate from messages if not directly 100-error_rate
            total = stats['total_messages_sent']
            success = stats['success_messages']
            rate = (success / total * 100) if total > 0 else 0
            success_rate.append(rate)
            print(f"  - Loaded {label}: {stats['messages_per_sec']:.1f} msg/s, {stats['memory_mb']:.0f} MB")
            
    return labels, throughput, memory, cpu, success_rate

labels, throughput, memory, cpu, success_rate = load_report_data(report_files)

if not labels:
    print("No data loaded. Exiting.")
    exit(1)

# Set visual style
try:
    plt.style.use('seaborn-v0_8-muted')
except:
    plt.style.use('seaborn')

def save_chart(filename, title, ylabel, data, chart_type='bar', color='#00568c', y_lim=None, formatter=None):
    plt.figure(figsize=(10, 6))
    
    if chart_type == 'bar':
        bars = plt.bar(labels, data, color=color)
        for i, v in enumerate(data):
            label_text = formatter(v) if formatter else f"{v}"
            plt.text(i, v + (max(data) * 0.02), label_text, ha='center', fontweight='bold')
    elif chart_type == 'area':
        plt.plot(labels, data, marker='o', linewidth=3, color=color, markersize=8)
        plt.fill_between(labels, data, alpha=0.2, color=color)
        for i, v in enumerate(data):
            label_text = formatter(v) if formatter else f"{v}"
            plt.text(i, v + (max(data) * 0.05), label_text, ha='center', fontweight='bold')
    elif chart_type == 'line':
        plt.plot(labels, data, marker='s', linewidth=3, color=color, markersize=8)
        for i, v in enumerate(data):
            label_text = formatter(v) if formatter else f"{v}"
            plt.text(i, v - (max(data) * 0.005), label_text, ha='center', fontweight='bold', va='bottom')

    plt.title(title, fontsize=16, fontweight='bold', pad=20)
    plt.ylabel(ylabel, fontweight='bold')
    if y_lim:
        plt.ylim(y_lim)
    
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.tight_layout()
    
    dest_path = os.path.join(BASE_DIR, filename)
    plt.savefig(dest_path, dpi=300)
    plt.close()
    print(f"Saved: {dest_path}")

# 1. Throughput (msg/s)
save_chart(
    'throughput_comparison.png', 
    'Throughput (Messages per Second)', 
    'msg/s', 
    throughput, 
    color=['#00568c80', '#00568c', '#00568c80'],
    formatter=lambda v: f"{v:,.1f}"
)

# 2. Memory Usage (MB)
save_chart(
    'memory_comparison.png', 
    'Memory Consumption (RAM)', 
    'MB', 
    memory, 
    chart_type='area', 
    color='#10b981',
    formatter=lambda v: f"{v:,.0f} MB"
)

# 3. CPU Usage (%)
save_chart(
    'cpu_comparison.png', 
    'CPU Utilization', 
    '%', 
    cpu, 
    color=['#64748b', '#64748b', '#64748b'],
    y_lim=(0, 110),
    formatter=lambda v: f"{v:.1f}%"
)

# 4. Success Rate (%)
save_chart(
    'success_rate_comparison.png', 
    'Success Rate (%)', 
    '%', 
    success_rate, 
    chart_type='line', 
    color='#ef4444',
    y_lim=(max(98.0, min(success_rate) - 0.5), 100.2),
    formatter=lambda v: f"{v:.3f}%"
)
