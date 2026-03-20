# -*- coding: utf-8 -*-
import matplotlib.pyplot as plt
import numpy as np
import os
import glob
from scipy.interpolate import make_interp_spline

def read_log(filepath):
    if not filepath or not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r') as f:
            return [float(line.strip()) for line in f if line.strip()]
    except:
        return []

def downsample(data, n_group=5):
    arr = np.array(data)
    new_len = len(arr) // n_group
    if new_len > 0:
        return arr[:new_len*n_group].reshape(-1, n_group).mean(axis=1)
    return arr

def smooth_line(x_raw, y_raw):
    if len(x_raw) > 5:
        x_new = np.linspace(x_raw[0], x_raw[-1], len(x_raw) * 4)
        spl = make_interp_spline(x_raw, y_raw, k=3)
        return x_new, spl(x_new)
    return x_raw, y_raw

def plot_comparison(log_dir, output_path):
    scenarios = [
        {'label': '500 Users', 'suffix': '500u', 'color': '#2ecc71'},
        {'label': '1000 Users', 'suffix': '1000u', 'color': '#3498db'},
        {'label': '1500 Users', 'suffix': '1500u', 'color': '#9b59b6'},
        {'label': '2000 Users', 'suffix': '2000u', 'color': '#e74c3c'}
    ]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 8), facecolor='#ffffff')
    plt.subplots_adjust(wspace=0.2, top=0.85, bottom=0.15)
    
    fig.suptitle('Global Stress Test Scenario Comparison (5s Aggregated)', fontsize=24, fontweight='bold')

    for sc in scenarios:
        # Find latest files
        cpu_files = glob.glob(os.path.join(log_dir, f"cpu_{sc['suffix']}_*.log"))
        ram_files = glob.glob(os.path.join(log_dir, f"ram_{sc['suffix']}_*.log"))
        
        cpu_file = max(cpu_files, key=os.path.getctime) if cpu_files else None
        ram_file = max(ram_files, key=os.path.getctime) if ram_files else None

        cpu_raw = read_log(cpu_file)
        ram_raw = read_log(ram_file)

        if not cpu_raw or not ram_raw:
            continue

        # Downsample to 5s
        n_group = 5
        cpu_ds = downsample(cpu_raw, n_group)
        ram_ds = downsample(ram_raw, n_group)
        
        # CPU Plot
        x_cpu = np.arange(0, len(cpu_ds) * n_group, n_group)
        x_cpu_smooth, cpu_smooth = smooth_line(x_cpu, cpu_ds)
        ax1.plot(x_cpu_smooth, cpu_smooth, color=sc['color'], linewidth=2.5, label=sc['label'])
        
        # RAM Plot
        x_ram = np.arange(0, len(ram_ds) * n_group, n_group)
        x_ram_smooth, ram_smooth = smooth_line(x_ram, ram_ds)
        ax2.plot(x_ram_smooth, ram_smooth, color=sc['color'], linewidth=2.5, label=sc['label'])

    # Styling CPU Chart
    ax1.set_title('CPU Utilization Comparison', fontsize=18, fontweight='bold', pad=15)
    ax1.set_xlabel('Time (seconds)', fontsize=12, color='#666666')
    ax1.set_ylabel('CPU Usage (%)', fontsize=12, fontweight='bold')
    ax1.set_ylim(0, 105)
    ax1.grid(True, linestyle='-', linewidth=0.5, color='black', alpha=0.1)
    ax1.legend(loc='lower right', frameon=True, facecolor='white', framealpha=0.9)

    # Styling RAM Chart
    ax2.set_title('Memory Usage Comparison', fontsize=18, fontweight='bold', pad=15)
    ax2.set_xlabel('Time (seconds)', fontsize=12, color='#666666')
    ax2.set_ylabel('Memory (MB)', fontsize=12, fontweight='bold')
    ax2.grid(True, linestyle='-', linewidth=0.5, color='black', alpha=0.1)
    ax2.legend(loc='upper right', frameon=True, facecolor='white', framealpha=0.9)

    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f"Comparison dashboard saved to: {output_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    log_dir = os.path.join(project_root, "test_logs")
    output_img = os.path.join(script_dir, "scenario_comparison.png")
    
    plot_comparison(log_dir, output_img)
