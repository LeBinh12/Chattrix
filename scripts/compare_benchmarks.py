import matplotlib.pyplot as plt
import numpy as np
import json
import os

# Base directory for the project
BASE_DIR = r'e:\Cá nhân\KhoaLuan'

# Paths to the report files provided by the user
report_files = [
    os.path.join(BASE_DIR, r'clientapp\src\components\testing\report_500u_1773868778906.json'),
    os.path.join(BASE_DIR, r'clientapp\src\components\testing\report_2000u_1773872751876.json'),
    os.path.join(BASE_DIR, r'clientapp\src\components\testing\report_5000u_1773425215047.json')
]

def load_report_data(file_paths):
    labels = []
    throughput = []
    memory = []
    cpu = []
    success_rate = []
    connections = []
    
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
            
            throughput.append(stats.get('messages_per_sec', 0))
            memory.append(stats.get('memory_mb', 0))
            cpu.append(stats.get('cpu_usage_percent', 0))
            
            # Extract successful connections with fallback
            conn = stats.get('successful_connections', stats.get('active_connections', 0))
            connections.append(conn)
            
            # Success Rate extraction
            if 'success_rate_percent' in stats:
                rate = stats['success_rate_percent']
            else:
                total = stats.get('total_messages_sent', 0)
                success = stats.get('success_messages', 0)
                rate = (success / total * 100) if total > 0 else 0
            success_rate.append(rate)
            
            print(f"  - Loaded {label}: {stats.get('messages_per_sec', 0):.1f} msg/s, {conn} users")
            
    return labels, throughput, memory, cpu, success_rate, connections

labels, throughput, memory, cpu, success_rate, connections = load_report_data(report_files)

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
        # Use a smooth line on top of the area for better definition
        plt.fill_between(labels, data, alpha=0.3, color=color)
        plt.plot(labels, data, marker='o', linewidth=3, color=color, markersize=8)
        
        # Calculate dynamic offset for labels
        data_range = max(data) - min(data)
        offset = data_range * 0.05 if data_range > 0 else 0.5
        
        for i, v in enumerate(data):
            label_text = formatter(v) if formatter else f"{v}"
            # Position labels slightly above the points
            plt.text(i, v + offset, label_text, ha='center', fontweight='bold', 
                     bbox={'facecolor': 'white', 'alpha': 0.7, 'edgecolor': 'none', 'pad': 1})
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
    chart_type='area',
    color='#3b82f6',
    formatter=lambda v: f"{v:,.1f}"
)

# 2. Memory Usage (MB)
save_chart(
    'memory_comparison.png', 
    'Memory Usage (RAM)', 
    'MB', 
    memory, 
    chart_type='area', 
    color='#10b981',
    formatter=lambda v: f"{v:,.0f} MB"
)

# 3. CPU Usage (%)
save_chart(
    'cpu_comparison.png', 
    'CPU Usage (%)', 
    '%', 
    cpu, 
    chart_type='area',
    color='#f59e0b',
    y_lim=(0, 110),
    formatter=lambda v: f"{v:.1f}%"
)

# 4. Success Rate (%)
save_chart(
    'success_rate_comparison.png', 
    'Success Rate (%)', 
    '%', 
    success_rate, 
    chart_type='area', 
    color='#ef4444',
    y_lim=(max(90.0, min(success_rate) - 2.0), 102.0),
    formatter=lambda v: f"{v:.2f}%"
)

# 5. Successful Connections (Users)
save_chart(
    'connections_comparison.png', 
    'Successful Connections (Users)', 
    'Users', 
    connections, 
    chart_type='area', 
    color='#6366f1',
    formatter=lambda v: f"{v:,} users"
)

# 6. Combined Overview Analysis (Separate Wave Silhouettes)
def save_overview_chart():
    # Categories for X-axis (Vietnamese)
    categories = ['Throughput', 'Bộ nhớ', 'CPU', 'Tỉ lệ thành công', 'Kết nối']
    x_indices = np.arange(len(categories))
    
    # Initialize the plot (1 row, 3 columns)
    fig, axes = plt.subplots(1, 3, figsize=(20, 7), sharey=True)
    plt.subplots_adjust(wspace=0.1, top=0.8)
    
    # Extract labels and targets from files to ensure consistency
    actual_labels = []
    targets = []
    for path in report_files:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            u = data['config']['target_users']
            actual_labels.append(f"{u} người dùng")
            targets.append(u)

    # Normalize data for comparison (0-100 range)
    def normalize_to_max(data):
        m = max(data) if max(data) > 0 else 1
        return [v / m * 100 for v in data]
    
    norm_data = {
        'Throughput': normalize_to_max(throughput),
        'Memory': normalize_to_max(memory),
        'CPU': cpu, # already 0-100
        'Success Rate': success_rate, # already 0-100
        'Connections': [curr / target * 100 for curr, target in zip(connections, targets)]
    }
    
    scenario_colors = ['#3b82f6', '#10b981', '#ef4444']
    
    for i, label in enumerate(actual_labels):
        ax = axes[i]
        
        # Values for this scenario across 5 metrics
        values = [
            norm_data['Throughput'][i],
            norm_data['Memory'][i],
            norm_data['CPU'][i],
            norm_data['Success Rate'][i],
            norm_data['Connections'][i]
        ]
        
        # Draw the "Wave" (Area)
        ax.plot(x_indices, values, marker='o', linewidth=4, color=scenario_colors[i], markersize=10, zorder=3)
        ax.fill_between(x_indices, values, alpha=0.3, color=scenario_colors[i])
        
        # Customize subplot
        ax.set_xticks(x_indices)
        ax.set_xticklabels(categories, rotation=45, ha='right', fontsize=10, fontweight='bold')
        ax.set_ylim(0, 115)
        ax.grid(axis='y', linestyle='--', alpha=0.5)
        ax.set_title(f"Kịch bản: {label}", fontsize=18, fontweight='bold', color=scenario_colors[i], pad=15)
        
        # Add labels on points
        for j, v in enumerate(values):
            ax.text(j, v + 3, f"{v:.1f}%", ha='center', fontsize=9, fontweight='bold', 
                    bbox={'facecolor': 'white', 'alpha': 0.8, 'edgecolor': 'none', 'pad': 2})

    axes[0].set_ylabel('Chỉ số Hiệu năng (%)', fontweight='bold', fontsize=12)
    plt.suptitle('Tổng quan Hiệu năng Hệ thống (Chuẩn hóa %)', fontsize=24, fontweight='bold', y=0.95)
    
    # Custom legend for the 5 metrics
    from matplotlib.lines import Line2D
    legend_elements = [Line2D([0], [0], color='grey', marker='o', label=cat, 
                              markersize=8, linestyle='--') for cat in categories]
    
    fig.legend(handles=legend_elements, loc='upper right', title="Danh mục đo lường", 
               bbox_to_anchor=(0.98, 0.92), frameon=True, shadow=True, borderpad=1)
    
    dest_path = os.path.join(BASE_DIR, 'overview_comparison.png')
    plt.savefig(dest_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Saved: {dest_path}")

save_overview_chart()
