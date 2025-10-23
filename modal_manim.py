"""
Modal app for compiling Manim animations in a containerized environment.

This solves the production deployment issue by running Manim compilation
in Modal's serverless containers with pre-installed dependencies.
"""
import tempfile
import subprocess
from pathlib import Path
from typing import Optional
import modal

# Define the container image with all Manim dependencies
manim_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        # LaTeX dependencies for mathematical formulas
        "texlive-latex-extra",
        "texlive-fonts-extra",
        "texlive-latex-recommended",
        "texlive-science",          # Additional math packages
        "cm-super",                 # Better font rendering
        # Media processing
        "ffmpeg",                   # Video processing
        "libcairo2-dev",           # Cairo graphics library
        "libpango1.0-dev",         # Pango text rendering
        "pkg-config",              # Build configuration
        # System utilities
        "git",                     # Version control
        "curl",                    # HTTP client
    )
    .pip_install(
        "manim==0.18.1",           # Pin specific Manim version for consistency
        "pillow>=10.0.0",          # Image processing
        "numpy>=1.24.0",           # Mathematical operations
        "scipy>=1.10.0",           # Scientific computing
        "matplotlib>=3.7.0",      # Additional plotting capabilities
    )
    .env({
        "MANIM_QUALITY": "low_quality",     # Default to faster rendering
        "MANIMGL_LOG_LEVEL": "WARNING",     # Reduce log verbosity
    })
)

# Create the Modal app
app = modal.App("classia-manim-compiler", image=manim_image.pip_install("fastapi[standard]"))

@app.function(
    timeout=300,        # 5 minute timeout for complex animations
    cpu=2.0,           # Dedicated CPU cores for faster rendering
    memory=4096,       # 4GB RAM for complex scenes
    retries=2,         # Retry on failure
)
def compile_manim_animation(
    python_code: str,
    class_name: str = "Scene",
    quality: str = "low_quality"
) -> dict:
    """
    Compile a Manim animation from Python code.

    Args:
        python_code: The complete Python code containing the Manim scene
        class_name: Name of the Scene class to render
        quality: Manim quality setting (low_quality, medium_quality, high_quality)

    Returns:
        dict: {
            "success": bool,
            "video_bytes": bytes (if successful),
            "error": str (if failed),
            "logs": str,
            "duration": float (seconds)
        }
    """
    import time
    start_time = time.time()

    try:
        print(f"[MODAL-MANIM] Starting compilation for {class_name}")

        # Create temporary directory for this compilation
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Write Python code to file
            python_file = temp_path / "animation.py"
            with open(python_file, "w") as f:
                f.write(python_code)

            print(f"[MODAL-MANIM] Python file written: {python_file}")

            # Determine quality flag
            quality_flag = f"-q{quality[0]}"  # -ql, -qm, or -qh
            if quality == "low_quality":
                quality_flag = "-ql"
            elif quality == "medium_quality":
                quality_flag = "-qm"
            elif quality == "high_quality":
                quality_flag = "-qh"

            # Execute Manim compilation
            cmd = [
                "manim",
                str(python_file),
                class_name,
                quality_flag,
                "--disable_caching",           # Don't cache for serverless
                "--output_file", "output",     # Consistent output name
                "--media_dir", str(temp_path), # Output to temp directory
            ]

            print(f"[MODAL-MANIM] Executing: {' '.join(cmd)}")

            # Run manim command
            result = subprocess.run(
                cmd,
                cwd=temp_path,
                capture_output=True,
                text=True,
                timeout=240  # 4 minute subprocess timeout
            )

            # Log the output
            print(f"[MODAL-MANIM] Manim stdout: {result.stdout}")
            if result.stderr:
                print(f"[MODAL-MANIM] Manim stderr: {result.stderr}")

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"Manim compilation failed: {result.stderr}",
                    "logs": result.stdout + result.stderr,
                    "duration": time.time() - start_time
                }

            # Find the generated video file
            # Manim creates: media/videos/animation/{quality}/output.mp4
            video_files = list(temp_path.glob("**/output.mp4"))

            if not video_files:
                # Fallback: look for any mp4 file with the class name
                video_files = list(temp_path.glob(f"**/{class_name}.mp4"))

            if not video_files:
                # List all files for debugging
                all_files = list(temp_path.rglob("*"))
                file_list = "\n".join(str(f) for f in all_files)

                return {
                    "success": False,
                    "error": f"Video file not found. Files created:\n{file_list}",
                    "logs": result.stdout + result.stderr,
                    "duration": time.time() - start_time
                }

            video_file = video_files[0]
            print(f"[MODAL-MANIM] Video found: {video_file}")

            # Read video file as bytes
            with open(video_file, "rb") as f:
                video_bytes = f.read()

            duration = time.time() - start_time
            print(f"[MODAL-MANIM] Compilation completed in {duration:.2f}s")

            return {
                "success": True,
                "video_bytes": video_bytes,
                "logs": result.stdout,
                "duration": duration
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Compilation timed out",
            "logs": "Manim compilation exceeded timeout limit",
            "duration": time.time() - start_time
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "logs": f"Exception occurred: {str(e)}",
            "duration": time.time() - start_time
        }

@app.function()
def health_check() -> dict:
    """Health check function to verify the Modal app is working."""
    try:
        # Test basic imports
        import manim
        import numpy
        import PIL

        # Check FFmpeg availability
        ffmpeg_available = False
        ffmpeg_version = "not found"
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                ffmpeg_available = True
                ffmpeg_version = result.stdout.split('\n')[0]
        except Exception:
            pass

        return {
            "status": "healthy",
            "manim_version": manim.__version__,
            "numpy_version": numpy.__version__,
            "ffmpeg_available": ffmpeg_available,
            "ffmpeg_version": ffmpeg_version,
            "timestamp": str(__import__('datetime').datetime.now())
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": str(__import__('datetime').datetime.now())
        }

def compile_manim_animation_inline(python_code: str, class_name: str = "Scene", quality: str = "low_quality") -> dict:
    """
    Inline compilation function for use within web endpoints.
    """
    import tempfile
    import subprocess
    import time
    from pathlib import Path

    start_time = time.time()

    try:
        print(f"[MODAL-INLINE] Starting compilation for {class_name}")

        # Create temporary directory for this compilation
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Write Python code to file
            python_file = temp_path / "animation.py"
            with open(python_file, "w") as f:
                f.write(python_code)

            print(f"[MODAL-INLINE] Python file written: {python_file}")

            # Determine quality flag
            quality_flag = "-ql"  # Default to low quality
            if quality == "medium_quality":
                quality_flag = "-qm"
            elif quality == "high_quality":
                quality_flag = "-qh"

            # Execute Manim compilation
            cmd = [
                "manim",
                str(python_file),
                class_name,
                quality_flag,
                "--disable_caching",
                "--output_file", "output",
                "--media_dir", str(temp_path),
            ]

            print(f"[MODAL-INLINE] Executing: {' '.join(cmd)}")

            # Run manim command
            result = subprocess.run(
                cmd,
                cwd=temp_path,
                capture_output=True,
                text=True,
                timeout=240  # 4 minute subprocess timeout
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": f"Manim compilation failed: {result.stderr}",
                    "logs": result.stdout + result.stderr,
                    "duration": time.time() - start_time
                }

            # Find the generated video file
            video_files = list(temp_path.glob("**/output.mp4"))

            if not video_files:
                # Fallback: look for any mp4 file with the class name
                video_files = list(temp_path.glob(f"**/{class_name}.mp4"))

            if not video_files:
                return {
                    "success": False,
                    "error": f"Video file not found after compilation",
                    "logs": result.stdout + result.stderr,
                    "duration": time.time() - start_time
                }

            video_file = video_files[0]
            print(f"[MODAL-INLINE] Video found: {video_file}")

            # Read video file as bytes
            with open(video_file, "rb") as f:
                video_bytes = f.read()

            duration = time.time() - start_time
            print(f"[MODAL-INLINE] Compilation completed in {duration:.2f}s")

            return {
                "success": True,
                "video_bytes": video_bytes,
                "logs": result.stdout,
                "duration": duration
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Compilation timed out",
            "logs": "Manim compilation exceeded timeout limit",
            "duration": time.time() - start_time
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Inline compilation error: {str(e)}",
            "duration": time.time() - start_time
        }

@app.function(
    timeout=300,
    cpu=2.0,
    memory=4096,
    retries=2,
)
def merge_scene_videos(
    video_urls: list,
    add_transitions: bool = False,
    transition_duration: float = 0.5
) -> dict:
    """
    Merge multiple scene videos into a single final video using FFmpeg.

    Args:
        video_urls: List of video URLs to merge (in order)
        add_transitions: Whether to add crossfade transitions between scenes
        transition_duration: Duration of transitions in seconds

    Returns:
        dict: {
            "success": bool,
            "video_bytes": bytes (if successful),
            "error": str (if failed),
            "duration": float (seconds),
            "scene_count": int
        }
    """
    import time
    import urllib.request
    start_time = time.time()

    try:
        print(f"[MODAL-MERGE] Starting merge of {len(video_urls)} videos")

        if not video_urls or len(video_urls) == 0:
            return {
                "success": False,
                "error": "No videos provided to merge",
                "duration": time.time() - start_time
            }

        # Single video case - just download and return
        if len(video_urls) == 1:
            print(f"[MODAL-MERGE] Single video, returning as-is")
            with urllib.request.urlopen(video_urls[0]) as response:
                video_bytes = response.read()

            return {
                "success": True,
                "video_bytes": video_bytes,
                "duration": time.time() - start_time,
                "scene_count": 1
            }

        # Create temporary directory for merge operation
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)

            # Download all videos
            print(f"[MODAL-MERGE] Downloading {len(video_urls)} videos...")
            video_files = []

            for i, url in enumerate(video_urls):
                video_file = temp_path / f"scene_{i}.mp4"
                print(f"[MODAL-MERGE] Downloading scene {i} from {url}")

                with urllib.request.urlopen(url) as response:
                    video_data = response.read()

                with open(video_file, 'wb') as f:
                    f.write(video_data)

                video_files.append(video_file)
                print(f"[MODAL-MERGE] Downloaded scene {i}: {len(video_data)} bytes")

            output_file = temp_path / "merged.mp4"

            if add_transitions:
                # Merge with crossfade transitions (requires re-encoding)
                print(f"[MODAL-MERGE] Merging with crossfade transitions...")

                # Build filter_complex for crossfade
                filter_parts = []
                inputs = " ".join([f"-i {vf}" for vf in video_files])

                # Generate xfade filters
                current_stream = "[0:v]"
                for i in range(len(video_files) - 1):
                    next_stream = f"[{i + 1}:v]"
                    output_stream = "[v]" if i == len(video_files) - 2 else f"[v{i}]"

                    filter_parts.append(
                        f"{current_stream}{next_stream}xfade=transition=fade:duration={transition_duration}:offset={i * 10}{output_stream}"
                    )
                    current_stream = output_stream

                filter_complex = ";".join(filter_parts)

                cmd = f"ffmpeg {inputs} -filter_complex \"{filter_complex}\" -map \"[v]\" -c:v libx264 -preset medium -crf 23 {output_file}"

            else:
                # Simple concatenation without re-encoding (faster)
                print(f"[MODAL-MERGE] Merging without transitions (fast concat)...")

                # Create concat list file
                list_file = temp_path / "concat_list.txt"
                with open(list_file, 'w') as f:
                    for video_file in video_files:
                        f.write(f"file '{video_file}'\n")

                cmd = [
                    "ffmpeg",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", str(list_file),
                    "-c", "copy",  # Copy streams without re-encoding
                    str(output_file)
                ]

            print(f"[MODAL-MERGE] Executing FFmpeg command...")

            # Run FFmpeg
            result = subprocess.run(
                cmd if isinstance(cmd, list) else cmd.split(),
                cwd=temp_path,
                capture_output=True,
                text=True,
                timeout=240
            )

            if result.returncode != 0:
                print(f"[MODAL-MERGE] FFmpeg stderr: {result.stderr}")
                return {
                    "success": False,
                    "error": f"FFmpeg merge failed: {result.stderr}",
                    "logs": result.stdout + result.stderr,
                    "duration": time.time() - start_time
                }

            # Check output file exists
            if not output_file.exists():
                return {
                    "success": False,
                    "error": "Merged video file not created",
                    "logs": result.stdout,
                    "duration": time.time() - start_time
                }

            # Read merged video
            with open(output_file, 'rb') as f:
                merged_video_bytes = f.read()

            duration = time.time() - start_time
            print(f"[MODAL-MERGE] ✅ Merge completed in {duration:.2f}s")
            print(f"[MODAL-MERGE] Output size: {len(merged_video_bytes)} bytes")

            return {
                "success": True,
                "video_bytes": merged_video_bytes,
                "duration": duration,
                "scene_count": len(video_urls)
            }

    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "FFmpeg merge timed out",
            "duration": time.time() - start_time
        }
    except Exception as e:
        print(f"[MODAL-MERGE] Error: {str(e)}")
        return {
            "success": False,
            "error": f"Merge error: {str(e)}",
            "duration": time.time() - start_time
        }

@app.function(
    timeout=300,
    cpu=2.0,
    memory=4096,
)
@modal.fastapi_endpoint(method="POST")
def compile_manim_web_endpoint(request_data: dict) -> dict:
    """
    Web endpoint for compiling Manim animations.

    Args:
        request_data: {
            "python_code": str,
            "class_name": str,
            "quality": str
        }

    Returns:
        dict: Compilation result with video_bytes encoded as base64
    """
    try:
        # Extract parameters from request
        python_code = request_data.get("python_code", "")
        class_name = request_data.get("class_name", "Scene")
        quality = request_data.get("quality", "low_quality")

        if not python_code:
            return {
                "success": False,
                "error": "python_code is required"
            }

        # Call the main compilation function directly (inline)
        result = compile_manim_animation_inline(python_code, class_name, quality)

        # Encode video bytes as base64 for JSON response
        if result.get("success") and result.get("video_bytes"):
            import base64
            result["video_bytes_base64"] = base64.b64encode(result["video_bytes"]).decode('utf-8')
            # Remove the raw bytes to avoid JSON serialization issues
            del result["video_bytes"]

        return result

    except Exception as e:
        return {
            "success": False,
            "error": f"Web endpoint error: {str(e)}"
        }

@app.function(
    timeout=300,
    cpu=2.0,
    memory=4096,
)
@modal.fastapi_endpoint(method="POST")
def merge_videos_web_endpoint(request_data: dict) -> dict:
    """
    Web endpoint for merging scene videos.

    Args:
        request_data: {
            "video_urls": list of video URLs to merge,
            "add_transitions": bool (optional, default False),
            "transition_duration": float (optional, default 0.5)
        }

    Returns:
        dict: Merge result with video_bytes encoded as base64
    """
    try:
        # Extract parameters from request
        video_urls = request_data.get("video_urls", [])
        add_transitions = request_data.get("add_transitions", False)
        transition_duration = request_data.get("transition_duration", 0.5)

        if not video_urls or not isinstance(video_urls, list):
            return {
                "success": False,
                "error": "video_urls array is required"
            }

        # Call the merge function
        result = merge_scene_videos(
            video_urls=video_urls,
            add_transitions=add_transitions,
            transition_duration=transition_duration
        )

        # Encode video bytes as base64 for JSON response
        if result.get("success") and result.get("video_bytes"):
            import base64
            result["video_bytes_base64"] = base64.b64encode(result["video_bytes"]).decode('utf-8')
            # Remove the raw bytes to avoid JSON serialization issues
            del result["video_bytes"]

        return result

    except Exception as e:
        return {
            "success": False,
            "error": f"Merge endpoint error: {str(e)}"
        }

# For local testing and deployment
if __name__ == "__main__":
    # Test with a simple animation
    test_code = '''
from manim import *

class TestAnimation(Scene):
    def construct(self):
        circle = Circle()
        circle.set_fill(PINK, opacity=0.5)
        self.play(Create(circle))
        self.wait()
'''

    print("Testing Modal Manim compilation...")
    with modal.enable_output():
        result = compile_manim_animation.remote(test_code, "TestAnimation")

    if result["success"]:
        print(f"✅ Success! Video size: {len(result['video_bytes'])} bytes")
        print(f"Duration: {result['duration']:.2f}s")
    else:
        print(f"❌ Failed: {result['error']}")
        print(f"Logs: {result['logs']}")
