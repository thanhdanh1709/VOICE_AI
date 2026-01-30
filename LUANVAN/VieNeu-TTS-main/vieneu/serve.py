import argparse
import os
import subprocess
import sys
import time
import requests

def check_command(cmd):
    try:
        subprocess.run([cmd, "--version"], capture_output=True, check=False)
        return True
    except FileNotFoundError:
        return False

def get_public_ip():
    try:
        return requests.get("https://api.ipify.org").text
    except:
        return "your-server-ip"

def run_server(args):
    """
    Starts the LMDeploy API server.
    """
    print(f"🚀 Starting VieNeu-TTS Remote Server...")
    print(f"📦 Model: {args.model}")
    
    cmd = [
        "lmdeploy", "serve", "api_server",
        args.model,
        "--server-name", "0.0.0.0",
        "--server-port", str(args.port),
        "--tp", str(args.tp),
        "--cache-max-entry-count", str(args.memory_util),
        "--model-name", args.model_name
    ]
    
    if args.quant_policy:
        cmd.extend(["--quant-policy", str(args.quant_policy)])

    print(f"🛠️ Command: {' '.join(cmd)}")
    
    # Start the server in a subprocess
    server_process = subprocess.Popen(cmd)
    
    # Wait for server to start
    print(f"⏳ Waiting for server to initialize on port {args.port}...")
    
    # Optional Tunneling
    tunnel_process = None
    public_url = None
    
    if args.tunnel:
        if check_command("bore"):
            print("🌐 Starting tunnel via 'bore'...")
            tunnel_cmd = ["bore", "local", str(args.port), "--to", "bore.pub"]
            tunnel_process = subprocess.Popen(tunnel_cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            
            # Try to catch the public URL from bore output
            start_time = time.time()
            while time.time() - start_time < 10:
                line = tunnel_process.stdout.readline()
                if "listening at" in line:
                    public_url = line.split("listening at")[-1].strip()
                    print(f"✅ Public URL: http://{public_url}")
                    break
        else:
            print("⚠️ 'bore' not found. Please install it to use --tunnel (https://github.com/ekzhang/bore)")
            print(f"📍 Using local address: http://{get_public_ip()}:{args.port}")
    else:
        print(f"✅ Server running locally at: http://0.0.0.0:{args.port}")
        print(f"📍 Public access (if enabled): http://{get_public_ip()}:{args.port}")

    print("\n💡 To use this server in your SDK:")
    sdk_url = f"http://{public_url}" if public_url else f"http://{get_public_ip()}:{args.port}"
    print(f"   from vieneu import Vieneu")
    print(f"   tts = Vieneu(mode='remote', api_base='{sdk_url}/v1', model_name='{args.model_name}')")
    print("")

    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        server_process.terminate()
        if tunnel_process:
            tunnel_process.terminate()

def main():
    parser = argparse.ArgumentParser(description="VieNeu-TTS Remote Server CLI")
    parser.add_argument("--model", type=str, default="pnnbao-ump/VieNeu-TTS", help="HuggingFace model ID or local path")
    parser.add_argument("--model-name", type=str, default="pnnbao-ump/VieNeu-TTS", help="Model name for API mapping")
    parser.add_argument("--port", type=int, default=23333, help="Server port")
    parser.add_argument("--tp", type=int, default=1, help="Tensor parallel size")
    parser.add_argument("--memory-util", type=float, default=0.3, help="GPU memory utilization (0.0-1.0)")
    parser.add_argument("--quant-policy", type=int, default=0, help="KV cache quantization (0, 4, 8)")
    parser.add_argument("--tunnel", action="store_true", help="Automatically expose the server via bore.pub")
    
    args = parser.parse_args()

    # Sync model_name with model if model is provided but model_name is default
    if args.model != "pnnbao-ump/VieNeu-TTS" and args.model_name == "pnnbao-ump/VieNeu-TTS":
        args.model_name = args.model
    
    # Check if lmdeploy is installed
    if not check_command("lmdeploy"):
        print("❌ 'lmdeploy' not found!")
        print("   Please install it using: pip install vieneu[gpu]")
        sys.exit(1)
        
    run_server(args)

if __name__ == "__main__":
    main()
