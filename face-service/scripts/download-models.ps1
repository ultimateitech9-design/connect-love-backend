$ErrorActionPreference = "Stop"
$modelDir = Join-Path $PSScriptRoot "..\models"
New-Item -ItemType Directory -Force -Path $modelDir | Out-Null

Invoke-WebRequest `
  -Uri "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx" `
  -OutFile (Join-Path $modelDir "face_detection_yunet_2023mar.onnx")

Invoke-WebRequest `
  -Uri "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx" `
  -OutFile (Join-Path $modelDir "face_recognition_sface_2021dec.onnx")

Write-Host "OpenCV face models downloaded."
