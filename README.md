# Image Recognition PoC with OpenCV ORB Feature Matching

Quick Proof of Concept for recognizing and highlighting images from references. Uses [OpenCV ORB feature matching](https://docs.opencv.org/4.x/dc/dc3/tutorial_py_matcher.html) and OpenCV.js

## Usage

- Open the app from a mobile device :

  ![QR Code to production url](./src/qrcode.jpg?raw=true "Title")

  https://opencv-orb-image-recognition-production.up.railway.app/

- Allow the access to the camera (your browser should prompt you, if not check your browser settings)
- Open up one of the reference images on a desktop computer
  - [Cat ref](./src/references-source/cat.jpg)
  - [Dog ref](./src/references-source/dog.jpg)
- Point your mobile device camera at the reference image, you should see it highlighted in green (note: matching won't work from too far away)

## Notes

- Ref images should be resized at 600px on the larger side, as the algorithm will have trouble matching images from a distance if the ref images are too large

## Local Dev Setup

### 1. Install Pnpm

See [https://pnpm.io/installation](https://pnpm.io/installation)

### 2. Install depedencies

```
pnpm install
```

### 3. Start the local server

```
pnpm dev
```

### 4. Open the local server from your mobile device

When starting, the local server should output the "Network" Url.

```
 VITE v6.3.5  ready in 108 ms

  ➜  Local:   https://localhost:3000/
  ➜  Local:   https://192.168.vite.*:3000/
  ➜  Network: https://192.168.x.x:3000/   <--------- Here
  ➜  press h + enter to show help
```

- Visit this address from your mobile device
- You'll see a message that the https cert is invalid. This is normal as we don't generate a cert in dev.
- Click on Advanced -> Proceeed to https://192.168.x.x (unsafe) to ignore the error and proceed to the local server

## TODO

- [ ] Check how performant it is with ~200 images
- [ ] Check performance on a lower-end device
- [ ] Check if we can make a custom OpenCV build with only the features we need to improve loading time
  - [ ] We'll probably need to generate custom typescript types for our custom build
- [ ] Write a script to resize and precompute the reference images and save them on disk to avoid computing them on the user device every time the app starts
- [ ] Clean-up the code, extract into different files and named function
