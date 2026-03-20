# -*- coding: utf-8 -*-
import json
import matplotlib.pyplot as plt
import numpy as np
import os
from scipy.interpolate import make_interp_spline

def load_report(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def summarize_reports(report_files):
    data = {
        'target_users': [],
        'active_connections': [],
        'total_received': [],
        'cpu_usage': [],
        'memory_mb': []
    }
    
    for f in report_files:
        if not os.path.exists(f):
            print(f"Warning: File {f} not found.")
            continue
            
        report = load_report(f)
        config = report.get('config', {})
        stats = report.get('stats', {})
        
        data['target_users'].append(config.get('target_users', 0))
        data['active_connections'].append(stats.get('active_connections', 0))
        data['total_received'].append(stats.get('total_messages_received', 0))
        data['cpu_usage'].append(stats.get('cpu_usage_percent', 0))
        data['memory_mb'].append(stats.get('memory_mb', 0))
        
    return data

def plot_wave_chart(ax, x, y, label, color, title, unit=""):
    # Interpolation for wave style
    x_new = np.linspace(x.min(), x.max(), 300)
    spl = make_interp_spline(x, y, k=2) 
    y_smooth = spl(x_new)
    y_smooth = np.clip(y_smooth, 0, None)
    
    ax.plot(x_new, y_smooth, color=color, linewidth=3, label=label)
    ax.fill_between(x_new, y_smooth, color=color, alpha=0.2)
    ax.scatter(x, y, color=color, edgecolor='white', s=80, zorder=5)
    
    ax.set_title(title, fontsize=14, pad=15, fontweight='bold')
    ax.grid(True, linestyle='--', alpha=0.3)
    ax.set_facecolor('#fdfdfd')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    for i, txt in enumerate(y):
        ax.annotate(f"{int(txt)}{unit}", (x[i], y[i]), textcoords="offset points", xytext=(0,10), ha='center', fontweight='bold')

def plot_line_chart(ax, x, y, label, color, title, unit=""):
    # Smooth line chart (no fill)
    x_new = np.linspace(x.min(), x.max(), 300)
    spl = make_interp_spline(x, y, k=2)
    y_smooth = spl(x_new)
    y_smooth = np.clip(y_smooth, 0, None)
    
    ax.plot(x_new, y_smooth, color=color, linewidth=3, linestyle='-', label=label, alpha=0.8)
    ax.scatter(x, y, color=color, edgecolor='white', s=80, zorder=5)
    
    ax.set_title(title, fontsize=14, pad=15, fontweight='bold')
    ax.grid(True, linestyle='--', alpha=0.3)
    ax.set_facecolor('#fdfdfd')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    for i, txt in enumerate(y):
        ax.annotate(f"{txt:.1f}{unit}", (x[i], y[i]), textcoords="offset points", xytext=(0,10), ha='center', fontweight='bold')

def plot_summary_v3(data, output_path):
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    plt.subplots_adjust(wspace=0.3, hspace=0.4)
    fig.suptitle('Broadcast Load Test Comparison Dashboard', fontsize=22, fontweight='bold', y=0.98)
    
    x = np.array(data['target_users'])
    
    # Sort data by target_users to ensure smooth splines
    idx = np.argsort(x)
    x = x[idx]
    active_conns = np.array(data['active_connections'])[idx]
    total_recv = np.array(data['total_received'])[idx]
    cpu_usage = np.array(data['cpu_usage'])[idx]
    mem_mb = np.array(data['memory_mb'])[idx]

    # 1. Connection Chart (Wave)
    plot_wave_chart(axes[0, 0], x, active_conns, 'Active', '#3498db', 'Active Connections')
    axes[0, 0].set_ylabel('Connections')
    
    # 2. Total Messages Received (Wave)
    plot_wave_chart(axes[0, 1], x, total_recv, 'Received', '#2ecc71', 'Total Messages Received')
    axes[0, 1].set_ylabel('Messages')
    
    # 3. CPU Usage (Line)
    plot_line_chart(axes[1, 0], x, cpu_usage, 'CPU', '#e74c3c', 'CPU Usage (%)', unit="%")
    axes[1, 0].set_ylabel('CPU (%)')
    
    # 4. Memory Usage (Line)
    plot_line_chart(axes[1, 1], x, mem_mb, 'RAM', '#9b59b6', 'Memory Usage (MB)', unit=" MB")
    axes[1, 1].set_ylabel('RAM (MB)')

    for ax in axes.flat:
        ax.set_xlabel('Target User Count')

    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Comparison dashboard saved to: {output_path}")

def plot_single_chart(x, y, label, color, title, unit, output_path, is_line=True):
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Interpolation for smooth line
    x_new = np.linspace(x.min(), x.max(), 300)
    spl = make_interp_spline(x, y, k=2)
    y_smooth = spl(x_new)
    y_smooth = np.clip(y_smooth, 0, None)
    
    ax.plot(x_new, y_smooth, color=color, linewidth=4, label=label, alpha=0.9)
    if not is_line:
        ax.fill_between(x_new, y_smooth, color=color, alpha=0.1)
        
    ax.scatter(x, y, color=color, edgecolor='white', s=120, zorder=5)
    
    ax.set_title(title, fontsize=18, pad=20, fontweight='bold')
    ax.set_xlabel('Target User Count', fontsize=12)
    ax.set_ylabel(title, fontsize=12)
    ax.grid(True, linestyle='--', alpha=0.4)
    ax.set_facecolor('#f9f9f9')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    for i, txt in enumerate(y):
        val_str = f"{txt:.1f}{unit}" if is_line else f"{int(txt)}{unit}"
        ax.annotate(val_str, (x[i], y[i]), textcoords="offset points", xytext=(0,15), ha='center', fontweight='bold', fontsize=10)

    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Chart saved to: {output_path}")

if __name__ == "__main__":
    base_path = r"e:\Cá nhân\KhoaLuan\clientapp\src\components\testing"
    report_files = [
        os.path.join(base_path, "report_500u_1773892839352.json"),
        os.path.join(base_path, "report_2000u_1773893732488.json"),
        os.path.join(base_path, "report_5000u_1773894341597.json")
    ]
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    data = summarize_reports(report_files)
    if data['target_users']:
        x = np.array(data['target_users'])
        idx = np.argsort(x)
        x = x[idx]
        cpu_y = np.array(data['cpu_usage'])[idx]
        ram_y = np.array(data['memory_mb'])[idx]
        
        # 1. CPU Comparison
        plot_single_chart(x, cpu_y, 'CPU', '#e74c3c', 'CPU Usage Comparison', '%', os.path.join(script_dir, "cpu_comparison.png"))
        
        # 2. RAM Comparison
        plot_single_chart(x, ram_y, 'RAM', '#9b59b6', 'Memory Usage Comparison', ' MB', os.path.join(script_dir, "ram_comparison.png"))
        
        # Also keep the summary dashboard
        plot_summary_v3(data, os.path.join(script_dir, "broadcast_test_summary.png"))
    else:
        print("No data found to plot.")
