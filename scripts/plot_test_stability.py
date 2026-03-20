# -*- coding: utf-8 -*-
import matplotlib.pyplot as plt
import numpy as np
import os
import glob

def read_log(filepath):
    if not filepath or not os.path.exists(filepath):
        return []
    try:
        with open(filepath, 'r') as f:
            return [float(line.strip()) for line in f if line.strip()]
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return []

from scipy.interpolate import make_interp_spline

def plot_stability(log_dir, output_path):
    scenarios = [
        {'label': 'Kịch bản 1', 'users': 500, 'suffix': '500u'},
        {'label': 'Kịch bản 2', 'users': 1000, 'suffix': '1000u'},
        {'label': 'Kịch bản 3', 'users': 1500, 'suffix': '1500u'},
        {'label': 'Kịch bản 4', 'users': 2000, 'suffix': '2000u'}
    ]

    # Create 2x2 grid layout
    fig, axes_grid = plt.subplots(2, 2, figsize=(18, 12), facecolor='#ffffff')
    axes = axes_grid.flatten()
    plt.subplots_adjust(wspace=0.25, hspace=0.3, top=0.88, bottom=0.1)
    
    # Custom Shared Legend at the top
    cpu_color = '#378ADD'
    ram_color = '#E24B4A'
    
    fig.suptitle('Phân tích độ ổn định hệ thống (So sánh kịch bản)', fontsize=26, fontweight='bold', y=0.98)

    found_any = False

    for i, sc in enumerate(scenarios):
        ax1 = axes[i]
        
        # Find latest files for this scenario
        cpu_pattern = os.path.join(log_dir, f"cpu_{sc['suffix']}_*.log")
        ram_pattern = os.path.join(log_dir, f"ram_{sc['suffix']}_*.log")
        
        cpu_files = glob.glob(cpu_pattern)
        ram_files = glob.glob(ram_pattern)
        
        cpu_file = max(cpu_files, key=os.path.getctime) if cpu_files else None
        ram_file = max(ram_files, key=os.path.getctime) if ram_files else None

        cpu_data_raw = read_log(cpu_file)
        ram_data_raw = read_log(ram_file)
        
        if not cpu_data_raw or not ram_data_raw:
            ax1.text(0.5, 0.5, f"Missing data for {sc['users']}u", ha='center', fontsize=14)
            continue
        
        found_any = True
        min_len_raw = min(len(cpu_data_raw), len(ram_data_raw))
        cpu_arr = np.array(cpu_data_raw[:min_len_raw])
        ram_arr = np.array(ram_data_raw[:min_len_raw])

        # Data processing: Downsample (mean of 5 points) if long
        if min_len_raw > 200:
            new_len = min_len_raw // 5
            cpu_data = cpu_arr[:new_len*5].reshape(-1, 5).mean(axis=1)
            ram_data = ram_arr[:new_len*5].reshape(-1, 5).mean(axis=1)
            x_raw = np.arange(0, new_len * 5, 5)
            min_len = new_len
        else:
            cpu_data = cpu_arr
            ram_data = ram_arr
            x_raw = np.arange(min_len_raw)
            min_len = min_len_raw

        # Smooth spline interpolation
        if min_len > 5:
            x_new = np.linspace(x_raw[0], x_raw[-1], min_len * 4)
            spl_cpu = make_interp_spline(x_raw, cpu_data, k=3)
            spl_ram = make_interp_spline(x_raw, ram_data, k=3)
            cpu_smooth = spl_cpu(x_new)
            ram_smooth = spl_ram(x_new)
            x_axis = x_new
        else:
            cpu_smooth = cpu_data
            ram_smooth = ram_data
            x_axis = x_raw

        # Aesthetics
        ax1.set_facecolor('#ffffff')
        ax1.grid(True, linestyle='-', linewidth=0.5, color='black', alpha=0.15)
        ax1.spines['top'].set_visible(False)

        # CPU Line (Primary Y)
        ax1.set_xlabel('Thời gian (giây)', fontsize=10, color='#666666')
        ax1.set_ylabel('Sử dụng CPU (%)', color=cpu_color, fontsize=11, fontweight='bold')
        ax1.plot(x_axis, cpu_smooth, color=cpu_color, linewidth=1.5, label='CPU %')
        ax1.tick_params(axis='y', labelcolor=cpu_color)
        ax1.set_ylim(0, 105)

        # RAM Line (Secondary Y)
        ax2 = ax1.twinx()
        ax2.set_ylabel('Bộ nhớ (MB)', color=ram_color, fontsize=11, fontweight='bold')
        ax2.plot(x_axis, ram_smooth, color=ram_color, linewidth=2, label='Bộ nhớ (MB)')
        ax2.tick_params(axis='y', labelcolor=ram_color)
        ax2.spines['top'].set_visible(False)
        
        # Stats & Duration
        avg_cpu = np.mean(cpu_data)
        avg_ram = np.mean(ram_data)
        d_min, d_sec = divmod(min_len_raw, 60)
        duration_str = f"{d_min}m {d_sec}s" if d_min > 0 else f"{d_sec}s"
        
        ax1.set_title(f"{sc['label']} ({sc['users']}u) — {duration_str}", fontsize=14, pad=10, fontweight='bold')
        
        # Inline stats below chart
        stats_text = f"CPU TB: {avg_cpu:.1f}% | RAM TB: {avg_ram:.0f} MB"
        ax1.text(0.5, -0.2, stats_text, transform=ax1.transAxes, color='#333333', 
                 fontsize=10, fontweight='bold', ha='center', bbox=dict(facecolor='white', alpha=0.8, edgecolor='#cccccc'))

    if found_any:
        plt.savefig(output_path, dpi=120, bbox_inches='tight')
        plt.close()
        print(f"Stability analysis image generated: {output_path}")
    else:
        print("No log files found to plot.")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    log_directory = os.path.join(project_root, "test_logs")
    output_image = os.path.join(script_dir, "test_stability_analysis.png")
    
    plot_stability(log_directory, output_image)
