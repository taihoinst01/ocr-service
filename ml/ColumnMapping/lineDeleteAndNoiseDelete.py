"""
@file morph_lines_detection.py
@brief Use morphology transformations for extracting horizontal and vertical lines sample code
"""
import numpy as np
import sys
import cv2 as cv
import base64
import os

def imread(filename, flags=cv.IMREAD_COLOR, dtype=np.uint8):
    try:
        n = np.fromfile(filename, dtype)
        img = cv.imdecode(n, flags)
        return img
    except Exception as e:
        print(e)
        return None

def imwrite(filename, img, params=None):
    try:
        ext = os.path.splitext(filename)[1]
        result, n = cv.imencode(ext, img, params)

        if result:
            with open(filename, mode='w+b') as f:
                n.tofile(f)
            return True
        else:
            return False
    except Exception as e:
        print(e)
        return False

def show_wait_destroy(winname, img):
    cv.imshow(winname, cv.resize(img, None, fx=0.25, fy=0.25, interpolation=cv.INTER_AREA))
    cv.moveWindow(winname, 500, 0)
    cv.resizeWindow(winname, 1200, 1200)
    cv.waitKey(0)
    cv.destroyWindow(winname)
def main(argv):
    # [load_image]
    # Check number of arguments
    if len(argv) < 1:
        print ('Not enough parameters')
        print ('Usage:\nmorph_lines_detection.py < path_to_image >')
        return -1
    argv[0] = base64.b64decode(argv[0]).decode("utf-8")
    # Load the image
    # src = cv.imread(argv[0], cv.IMREAD_COLOR)
    src = imread(argv[0])
    # Check if image is loaded fine
    if src is None:
        print ('Error opening image: ' + argv[0])
        return -1
    # Show source image
    # cv.imshow("src", src)
    # [load_image]
    # [gray]
    # Transform source image to gray if it is not already
    if len(src.shape) != 2:
        gray = cv.cvtColor(src, cv.COLOR_BGR2GRAY)
    else:
        gray = src
    # Show gray image
    #show_wait_destroy("gray", gray)
    # [gray]
    # [bin]
    # Apply adaptiveThreshold at the bitwise_not of gray, notice the ~ symbol
    gray = cv.bitwise_not(gray)
    bw = cv.adaptiveThreshold(gray, 255, cv.ADAPTIVE_THRESH_MEAN_C, \
                                cv.THRESH_BINARY, 15, -2)
    # Show binary image
    #show_wait_destroy("binary", bw)
    # [bin]
    # [init]
    # Create the images that will use to extract the horizontal and vertical lines
    horizontal = np.copy(bw)
    vertical = np.copy(bw)
    # [init]
    # [horiz]
    # Specify size on horizontal axis
    cols = horizontal.shape[1]
    horizontal_size = cols / 20
    # Create structure element for extracting horizontal lines through morphology operations
    horizontalStructure = cv.getStructuringElement(cv.MORPH_RECT, (int(horizontal_size), 1))
    # Apply morphology operations

    #show_wait_destroy("horizontal1", horizontal)
    horizontal2 = cv.erode(horizontal, horizontalStructure)
    #show_wait_destroy("horizontal1", horizontal)
    horizontal2 = cv.dilate(horizontal2, horizontalStructure)
    horizontal = cv.bitwise_not(horizontal)
    #show_wait_destroy("horizontal1", horizontal2)
    horizontal = cv.add(horizontal, horizontal2)
    #show_wait_destroy("horizontal2", horizontal)

    # Show extracted horizontal lines
    # show_wait_destroy("horizontal", horizontal)
    # [horiz]
    # [vert]
    # Specify size on vertical axis
    rows = vertical.shape[0]
    verticalsize = 150
    # Create structure element for extracting vertical lines through morphology operations
    verticalStructure = cv.getStructuringElement(cv.MORPH_RECT, (1, int(verticalsize)))
    # Apply morphology operations
    vertical = cv.erode(vertical, verticalStructure)
    vertical = cv.dilate(vertical, verticalStructure)
    # Show extracted vertical lines

    #vertical = cv.bitwise_not(vertical)
    #show_wait_destroy("horizontal1", vertical)
    horizontal = cv.add(horizontal, vertical)

    horizontal = cv.fastNlMeansDenoising(horizontal, None, 13, 13)
    #show_wait_destroy("vertical", horizontal)

    horizontal = cv.resize(horizontal, dsize=(1420, 2048), interpolation=cv.INTER_AREA)
    imwrite(argv[0], horizontal)
    print("fileConvert Success")
    return 0
if __name__ == "__main__":
    main(sys.argv[1:])