from rapidocr import RapidOCR

engine = RapidOCR()

img_path = "./your.png"
result = engine(img_path)
print(result)

result.vis("vis_result.jpg")
