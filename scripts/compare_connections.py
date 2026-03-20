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
            return [int(line.strip()) for line in f if line.strip()]
    except:
        return []

def plot_connections_comparison():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    log_dir = os.path.join(project_root, "test_logs")
    output_path = os.path.join(script_dir, "connections_comparison.png")

    scenarios = [
        {'label': 'Kịch bản 1 ', 'suffix': '500u', 'color': '#2ecc71'},
        {'label': 'Kịch bản 2', 'suffix': '1000u', 'color': '#3498db'},
        {'label': 'Kịch bản 3', 'suffix': '1500u', 'color': '#9b59b6'},
        {'label': 'Kịch bản 4', 'suffix': '2000u', 'color': '#e74c3c'}
    ]

    plt.figure(figsize=(14, 8), facecolor='#ffffff')
    
    found_any = False

    for sc in scenarios:
        # Find latest conns file
        pattern = os.path.join(log_dir, f"conns_{sc['suffix']}_*.log")
        files = glob.glob(pattern)
        
        if not files:
            continue
            
        latest_file = max(files, key=os.path.getctime)
        data = read_log(latest_file)
        
        if not data:
            continue
            
        found_any = True
        x_axis = np.arange(len(data))
        
        # Plot with filled area for "Mountain" effect
        plt.plot(x_axis, data, color=sc['color'], linewidth=2.5, label=sc['label'], alpha=0.9)
        plt.fill_between(x_axis, data, color=sc['color'], alpha=0.1)

    if not found_any:
        print("No log files found for comparison.")
        return

    plt.title('So sánh lượng kết nối (Biểu đồ hình ngọn núi)', fontsize=22, fontweight='bold', pad=20)
    plt.xlabel('Thời gian (giây)', fontsize=14, color='#333333')
    plt.ylabel('Số lượng kết nối (User)', fontsize=14, color='#333333')
    
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.legend(loc='upper right', fontsize=12, frameon=True, facecolor='white', framealpha=0.9)
    
    # Set Y ticks to match the user counts
    plt.yticks(np.arange(0, 2501, 500))
    plt.ylim(0, 2200)

    plt.tight_layout()
    plt.savefig(output_path, dpi=120)
    plt.close()
    print(f"Bản đồ so sánh kết nối đã được lưu tại: {output_path}")

if __name__ == "__main__":
    plot_connections_comparison()
