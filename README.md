# Image Recognition PoC with OpenCV ORB Feature Matching

Quick Proof of Concept for recognizing and highlighting images from references. Uses [OpenCV ORB feature matching](https://docs.opencv.org/4.x/dc/dc3/tutorial_py_matcher.html) and OpenCV.js

## Usage

- Open the app from a mobile device :

  ![QR Code to production url](./src/qrcode.jpg?raw=true "Title")

  https://opencv-orb-image-recognition-production.up.railway.app/

- Allow the access to the camera (your browser should prompt you, if not check your browser settings)
- Open up one of the reference images on a desktop computer
  - [Cat ref](./scripts/references-source/cat.jpg)
  - [Dog ref](./scripts/references-source/dog.jpg)
- Point your mobile device camera at the reference image, you should see it highlighted in green (note: matching won't work from too far away)

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

## Add new Images

- Add images to the `scripts/references-source` folder
- Run the `pnpm prepare-references` script. This will output them in ./public and prepare the references.json file
- Reload your page

## TODO

- [ ] Check how performant it is with ~200 images
- [ ] Check performance on a lower-end device
- [ ] Check if we can make a custom OpenCV build with only the features we need to improve loading time
  - [ ] We'll probably need to generate custom typescript types for our custom build
- [x] Write a script to resize the references images
- [ ] Clean-up the code, extract into different files and named function
