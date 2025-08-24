#!/usr/bin/env python3
import sys
import json
import base64
import time
from io import BytesIO
from PIL import Image
from rapidocr import RapidOCR


def test_imports():
    """Test all imports and print status"""
    print("🧪 Running standalone import test...", file=sys.stderr)
    try:
        print("✅ sys import: OK", file=sys.stderr)
        print("✅ json import: OK", file=sys.stderr)
        print("✅ base64 import: OK", file=sys.stderr)
        print("✅ time import: OK", file=sys.stderr)
        print("✅ io.BytesIO import: OK", file=sys.stderr)
        print("✅ PIL.Image import: OK", file=sys.stderr)
        from rapidocr import RapidOCR

        print("✅ rapidocr.RapidOCR import: OK", file=sys.stderr)

        # Test RapidOCR initialization
        engine = RapidOCR()
        print("✅ RapidOCR initialization: OK", file=sys.stderr)

        print("🎉 All imports and initialization successful!", file=sys.stderr)
        return True
    except Exception as e:
        print(f"❌ Import test failed: {str(e)}", file=sys.stderr)
        import traceback

        print(f"📋 Traceback: {traceback.format_exc()}", file=sys.stderr)
        return False


def main():
    # Check if we're running standalone (check command line args)
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        # Test mode requested
        print("🔧 Test mode requested via --test flag", file=sys.stderr)
        success = test_imports()
        if success:
            print(json.dumps({"success": True, "message": "Standalone test passed"}))
            sys.exit(0)
        else:
            print(json.dumps({"success": False, "error": "Standalone test failed"}))
            sys.exit(1)

    try:
        print("🐍 Python OCR service starting...", file=sys.stderr)
        start_time = time.time()

        # Read image data from stdin
        print("📖 Reading image data from stdin...", file=sys.stderr)
        image_data = sys.stdin.read()
        print(f"📖 Read {len(image_data)} characters from stdin", file=sys.stderr)

        # Parse the JSON input
        print("🔍 Parsing JSON input...", file=sys.stderr)
        input_json = json.loads(image_data)
        base64_image = input_json.get("image")

        if not base64_image:
            raise ValueError("No image data provided")

        print(
            f"📊 Base64 image data length: {len(base64_image)} characters",
            file=sys.stderr,
        )

        # Decode base64 image
        print("🖼️ Decoding base64 image...", file=sys.stderr)
        image_bytes = base64.b64decode(base64_image)
        print(f"🖼️ Decoded image size: {len(image_bytes)} bytes", file=sys.stderr)

        image = Image.open(BytesIO(image_bytes))
        print(
            f"🖼️ Image opened: {image.size[0]}x{image.size[1]} pixels, mode: {image.mode}",
            file=sys.stderr,
        )

        # Initialize RapidOCR
        print("🚀 Initializing RapidOCR engine...", file=sys.stderr)
        engine = RapidOCR(
            params={
                # Never skip detection because of size or aspect ratio
                "Global.min_height": 1,  # ↓ from 30 so small crops still run Det
                "Global.width_height_ratio": -1,  # disable aspect-ratio skip
                # Make the detector see more pixels and keep weaker regions
                "Det.limit_type": "min",
                "Det.limit_side_len": 1920,  # ↑ upscale before Det (try 1280–1920)
                "Det.thresh": 0.05,
                "Det.box_thresh": 0.1,
                "Det.unclip_ratio": 2.0,
                "Det.use_dilation": True,
                "Global.text_score": 0.3,  # allow weak digit lines to pass
            }
        )

        print("✅ RapidOCR engine initialized", file=sys.stderr)

        # Perform OCR
        print("🔍 Performing OCR on image...", file=sys.stderr)
        ocr_start_time = time.time()
        result = engine(image)
        ocr_end_time = time.time()
        print(
            f"✅ OCR completed in {ocr_end_time - ocr_start_time:.2f} seconds",
            file=sys.stderr,
        )

        # Extract text from results
        print("📝 Extracting text from OCR results...", file=sys.stderr)
        texts = []
        if result and hasattr(result, "txts") and result.txts:
            print(f"📝 Found {len(result.txts)} text detections", file=sys.stderr)
            high_confidence_count = 0
            for i, text in enumerate(result.txts):
                confidence = (
                    result.scores[i]
                    if hasattr(result, "scores") and i < len(result.scores)
                    else 0.0
                )

                # Extract bounding box coordinates
                bounding_box = None
                if (
                    hasattr(result, "boxes")
                    and result.boxes is not None
                    and i < len(result.boxes)
                ):
                    box = result.boxes[i]
                    # Convert numpy array to list and round coordinates
                    bounding_box = [
                        [round(float(coord), 2) for coord in point]
                        for point in box.tolist()
                    ]

                texts.append(
                    {
                        "text": text,
                        "confidence": confidence,
                        "bounding_box": bounding_box,
                    }
                )

                # Log all detections with their confidence scores
                if bounding_box:
                    # Extract top-left point (first point in the bounding box)
                    top_left_x, top_left_y = bounding_box[0]
                    print(
                        f"📝 Detection {i+1}: '{text}' (confidence: {confidence:.3f}) at ({top_left_x}, {top_left_y})",
                        file=sys.stderr,
                    )
                else:
                    print(
                        f"📝 Detection {i+1}: '{text}' (confidence: {confidence:.3f})",
                        file=sys.stderr,
                    )
        else:
            print("⚠️ No text detections found", file=sys.stderr)

        # Combine all detected text
        combined_text = " ".join([item["text"] for item in texts])
        avg_confidence = (
            sum([item["confidence"] for item in texts]) / len(texts) if texts else 0.0
        )

        print(
            f"📊 Combined text length: {len(combined_text)} characters", file=sys.stderr
        )
        print(f"📊 Average confidence: {avg_confidence:.3f}", file=sys.stderr)

        # Generate visualization image if detections were found
        visualization_path = None
        if result and hasattr(result, "vis") and texts:
            try:
                import os
                from datetime import datetime

                # Create a unique filename with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"ocr_visualization_{timestamp}.jpg"

                # Save to the same directory as the script
                script_dir = os.path.dirname(os.path.abspath(__file__))
                visualization_path = os.path.join(script_dir, filename)

                print(f"🖼️ Generating visualization image...", file=sys.stderr)
                result.vis(visualization_path)
                print(
                    f"🖼️ Visualization saved to: {visualization_path}", file=sys.stderr
                )

            except Exception as vis_error:
                print(
                    f"⚠️ Failed to generate visualization: {vis_error}", file=sys.stderr
                )
                visualization_path = None

        # Return results as JSON
        output = {
            "success": True,
            "text": combined_text,
            "confidence": avg_confidence,
            "detections": texts,
            "visualization_path": visualization_path,
        }

        total_time = time.time() - start_time
        print(f"⏱️ Total processing time: {total_time:.2f} seconds", file=sys.stderr)
        print("✅ Sending results to stdout...", file=sys.stderr)

        print(json.dumps(output))
        print("🎉 Python OCR service completed successfully", file=sys.stderr)

    except Exception as e:
        print(f"❌ Python OCR service error: {str(e)}", file=sys.stderr)
        import traceback

        print(f"📋 Traceback: {traceback.format_exc()}", file=sys.stderr)
        error_output = {"success": False, "error": str(e)}
        print(json.dumps(error_output))
        sys.exit(1)


if __name__ == "__main__":
    main()
