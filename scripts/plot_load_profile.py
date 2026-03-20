import matplotlib.pyplot as plt
import numpy as np
import os
import sys

def plot_load_profile(user_count, timestamp):
    # Fix paths to be relative to the script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    log_dir = os.path.join(project_root, "test_logs")
    
    cpu_file = os.path.join(log_dir, f"cpu_{user_count}u_{timestamp}.log")
    ram_file = os.path.join(log_dir, f"ram_{user_count}u_{timestamp}.log")
    conn_file = os.path.join(log_dir, f"conns_{user_count}u_{timestamp}.log")

    if not all(os.path.exists(f) for f in [cpu_file, ram_file, conn_file]):
        print(f"Error: Missing one or more log files for {user_count}u_{timestamp}")
        return

    with open(cpu_file, 'r') as f:
        cpu_data = [float(line.strip()) for line in f if line.strip()]
    with open(ram_file, 'r') as f:
        ram_data = [float(line.strip()) for line in f if line.strip()]
    with open(conn_file, 'r') as f:
        conn_data = [float(line.strip()) for line in f if line.strip()]

    # Ensure all arrays are the same length
    min_len = min(len(cpu_data), len(ram_data), len(conn_data))
    cpu_data = cpu_data[:min_len]
    ram_data = ram_data[:min_len]
    conn_data = conn_data[:min_len]
    time_pts = np.arange(min_len)

    fig, ax1 = plt.subplots(figsize=(12, 7))

    # Plot Connections (Mountain shape)
    color_conn = 'tab:blue'
    ax1.set_xlabel('Time (seconds)')
    ax1.set_ylabel('Active Connections', color=color_conn)
    ax1.fill_between(time_pts, conn_data, alpha=0.2, color=color_conn, label='Connections')
    ax1.plot(time_pts, conn_data, color=color_conn, linewidth=2)
    ax1.tick_params(axis='y', labelcolor=color_conn)
    ax1.grid(True, linestyle='--', alpha=0.6)

    # Instantiate a second axes that shares the same x-axis
    ax2 = ax1.twinx()
    color_cpu = 'tab:red'
    ax2.set_ylabel('CPU Usage (%)', color=color_cpu)
    ax2.plot(time_pts, cpu_data, color=color_cpu, linewidth=1.5, alpha=0.8, label='CPU')
    ax2.tick_params(axis='y', labelcolor=color_cpu)
    ax2.set_ylim(0, 110)

    # Instantiate a third axes
    ax3 = ax1.twinx()
    ax3.spines['right'].set_position(('outward', 60))
    color_ram = 'tab:green'
    ax3.set_ylabel('Memory (MB)', color=color_ram)
    ax3.plot(time_pts, ram_data, color=color_ram, linewidth=1.5, alpha=0.8, label='RAM')
    ax3.tick_params(axis='y', labelcolor=color_ram)
    
    plt.title(f'Load Test Profile: {user_count} Users (Mountain View)')
    
    # Combined legend
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    lines3, labels3 = ax3.get_legend_handles_labels()
    ax1.legend(lines1 + lines2 + lines3, labels1 + labels2 + labels3, loc='upper left')

    fig.tight_layout()
    output_file = f"load_profile_{user_count}u_{timestamp}.png"
    plt.savefig(output_file)
    print(f"Chart saved to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Default to the one the user has open
        plot_load_profile(1000, 1773916708)
    else:
        plot_load_profile(sys.argv[1], sys.argv[2])
