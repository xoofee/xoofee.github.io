---
title: "OpenCV Calibration: Calling Hierarchies for H, F, E, and BA"
date: 2026-02-12
permalink: /posts/2026/02/opencv-h-f-e-ba-calling-hierarchies/
categories: math
tags: [computer-vision, opencv, calibration, homography, fundamental-matrix, essential-matrix, bundle-adjustment]
excerpt: "Calling hierarchies for computing homography (H), fundamental matrix (F), essential matrix (E), and bundle adjustment (BA) in OpenCV."
---

This note summarizes the **calling hierarchies** for computing **H**, **F**, **E**, and **BA** in OpenCV — i.e. where the public APIs dispatch to (USAC, RANSAC, LMeDS, RHO, or direct solvers) and how refinement and Jacobians are wired.

---

## 1. Homography (H)

```
cv::findHomography(_points1, _points2, method, ...)     [fundam.cpp]
├── if method in [USAC_DEFAULT .. USAC_MAGSAC]:
│   └── usac::findHomography(...)
│       └── usac::run(params, srcPoints, dstPoints, ransac_output, ...)   [ransac_solvers.cpp]
│           └── Ransac ransac(params, ...); ransac.run(ransac_output)
│               └── loop: _sampler->generateSample(sample)
│                   └── _estimator->estimateModels(sample, models)   [HomographyEstimator]
│                       └── min_solver->estimate(...)   [HomographyMinimalSolver4pts]  or
│                       └── non_min_solver->estimate(...)   [HomographyNonMinimalSolver]
│                   └── _quality->getScore(models[i]) / getInliers(...)
│                   └── (optional) _local_optimization->refineModel(...)
│               └── polisher (final LSQ) → ransac_output->getModel()
│
├── else if method == 0 || npoints == 4:
│   └── cb->runKernel(src, dst, H)   [HomographyEstimatorCallback, ptsetreg.cpp]
│
├── else if method == RANSAC:
│   └── createRANSACPointSetRegistrator(cb, 4, ...)->run(src, dst, H, tempMask)   [ptsetreg.cpp]
│       └── loop: getSubset() → cb->runKernel(ms1, ms2, model)   [HomographyEstimatorCallback]
│       └── findInliers() → cb->computeError()
│       └── (best model) → cb->runKernel(src, dst, H) on inliers
│
├── else if method == LMEDS:
│   └── createLMeDSPointSetRegistrator(cb, 4, ...)->run(src, dst, H, tempMask)
│       └── same pattern: runKernel / computeError
│
└── else if method == RHO:
    └── createAndRunRHORegistrator(...)   [fundam.cpp]
        └── rhoInit() → rhoHest(p, src, dst, inl, N, ...)   [rho.cpp]
            └── initRun() → allocatePerRun(), ...
            └── loop: hypothesize() && verify()
            │   └── hypothesize: getPROSACSample() → generateModel()   [Gaussian elim, rho.cpp]
            │   └── verify: evaluateModelSPRT() → saveBestModel()
            │   └── (if best) refine()   [Levenberg–Marquardt]
            │       └── sacCalcJacobianErrors(best.H, ...)   [analytical J]
            │       └── loop: sacChol8x8Damped / sacTRISolve8x8 / sacSub8x1 / sacCalcJacobianErrors(newH,...)
            └── (if enabled) refine() again → outputModel()
            └── finiRun()

if result && npoints > 4 && method != RHO:
    └── LMSolver::create(HomographyRefineCallback(src, dst), 10)->run(H8)   [fundam.cpp]
        └── HomographyRefineCallback::compute(param, err, Jac)   [analytical Jacobian]
```

**Files:** `calib3d/src/fundam.cpp`, `usac/ransac_solvers.cpp`, `usac/estimator.cpp`, `usac/homography_solver.cpp`, `ptsetreg.cpp`, `rho.cpp`.

---

## 2. Fundamental matrix (F)

```
cv::findFundamentalMat(_points1, _points2, method, ...)   [fundam.cpp]
├── if method in [USAC_DEFAULT .. USAC_MAGSAC]:
│   └── usac::findFundamentalMat(...)
│       └── usac::run(params, points1, points2, ransac_output, ...)
│           └── Ransac::run()
│               └── _estimator->estimateModels(sample, models)   [FundamentalEstimator]
│                   └── min_solver->estimate(...)   [FundamentalMinimalSolver7pts/8pts]
│                   └── or non_min_solver->estimate(...)   [EpipolarNonMinimalSolver / LarssonOptimizer for F]
│               └── (optional) _local_optimization->refineModel(...)
│               └── (optional) polisher
│
├── else if npoints == 7 || method == FM_8POINT:
│   └── cb->runKernel(m1, m2, F)   [FMEstimatorCallback, fundam.cpp]
│
└── else:
    └── createRANSACPointSetRegistrator(cb, 7, ...)->run(m1, m2, F, _mask)   or
    └── createLMeDSPointSetRegistrator(cb, 7, ...)->run(m1, m2, F, _mask)
        └── cb = FMEstimatorCallback → runKernel() / computeError()
```

**USAC F refinement:** `LarssonOptimizer` (F mode) → `refine_relpose()` in `usac/bundle.cpp` (`RelativePoseJacobianAccumulator`, analytical J).

**Files:** `calib3d/src/fundam.cpp`, `usac/ransac_solvers.cpp`, `usac/estimator.cpp`, `usac/fundamental_solver.cpp`, `usac/bundle.cpp`.

---

## 3. Essential matrix (E)

```
cv::findEssentialMat(_points1, _points2, _cameraMatrix, method, ...)   [five-point.cpp]
├── if method in [USAC_DEFAULT .. USAC_MAGSAC]:
│   └── usac::findEssentialMat(...)
│       └── usac::run(params, points1, points2, ransac_output, cameraMatrix1, cameraMatrix1, ...)
│           └── Ransac::run()   [points calibrated/merged in ctor]
│               └── _estimator->estimateModels(sample, models)   [EssentialEstimator]
│                   └── min_solver->estimate(...)   [EssentialMinimalSolver5pts]
│                   └── or non_min_solver->estimate(...)   [LarssonOptimizer for E]
│               └── (optional) _local_optimization->refineModel(...)
│               └── (optional) _fo_solver final polish
│
└── else (RANSAC / LMEDS):
    └── normalize points by K (fx, fy, cx, cy)
    └── createRANSACPointSetRegistrator(EMEstimatorCallback(), 5, ...)->run(points1, points2, E, _mask)
    └── or createLMeDSPointSetRegistrator(EMEstimatorCallback(), 5, ...)->run(...)
        └── runKernel() / computeError()   [EMEstimatorCallback, five-point.cpp]
```

**E refinement (USAC):** `LarssonOptimizer` (E mode) → `refine_relpose()` in `usac/bundle.cpp` → `RelativePoseJacobianAccumulator::accumulate()` (analytical J for E and Sampson error).

**Variant with two cameras + distortion:**  
`findEssentialMat(pts1, pts2, K1, dist1, K2, dist2, ...)` → `undistortPoints` → `findEssentialMat_` → same normalized path.

**Files:** `calib3d/src/five-point.cpp`, `usac/ransac_solvers.cpp`, `usac/essential_solver.cpp`, `usac/fundamental_solver.cpp` (LarssonOptimizer), `usac/bundle.cpp`.

---

## 4. Bundle adjustment (BA)

### 4a. Calib3d (camera calibration) BA

```
cv::calibrateCamera(...)   [calibration.cpp]
└── calibrateCameraRO(...)
    └── collectCalibrationData(...)
    └── calibrateCameraInternal(objectPoints, imagePoints, npoints, ..., cameraMatrix, distCoeffs, rvecs, tvecs, ...)
        └── findExtrinsicCameraParams2() per view (initial extrinsics)
        └── CvLevMarq solver(nparams, 0, termCrit)
        └── loop: solver.updateAlt(_param, _JtJ, _JtErr, _errNorm)
            └── for each image:
            │   └── projectPoints(_Mi, _ri, _ti, intrin, dist, _mp, _dpdr, _dpdt, _dpdf, _dpdc, _dpdk, ...)
            │       └── calibration_base: projectPoints()   [analytical Jacobians: dpdr, dpdt, etc.]
            │       └── Rodrigues(..., _dRdr) used inside projectPoints for dpdr
            │   └── JtJ += Ji.t()*Ji, Je.t()*Je, Ji.t()*Je, ...; JtErr += Ji.t()*err, Je.t()*err
            └── when !proceed: (optional) JtJinv for stdDevs; break
        └── return reprojErr
```

**Files:** `calib3d/src/calibration.cpp`, `calib3d/src/calibration_base.cpp` (projectPoints, Rodrigues).

### 4b. Stitching BA

```
Stitcher::estimateTransform(images, masks)   [stitcher.cpp]
└── estimateCameraParams()
    ├── (*estimator_)(features_, pairwise_matches_, cameras_)   [e.g. HomographyBasedEstimator::estimate]
    │   └── estimateFocal() → pairwise homographies → initial cameras_
    │
    └── (*bundle_adjuster_)(features_, pairwise_matches_, cameras_)
        └── BundleAdjusterBase::estimate(...)   [motion_estimators.cpp]
            └── setUpInitialCameraParams(cameras)
            └── CvLevMarq solver(num_images_ * num_params_per_cam_, total_num_matches_ * num_errs_per_measurement_, ...)
            └── loop: solver.update(_param, _jac, _err)
                └── if _jac: calcJacobian(jac)   [numerical: finite differences]
                └── if _err: calcError(err)
            └── obtainRefinedCameraParams(cameras)
```

**Concrete BA classes (all use numerical J in `calcJacobian`):**

- `BundleAdjusterReproj::calcJacobian` (Reproj)
- `BundleAdjusterRay::calcJacobian` (Ray)
- `BundleAdjusterAffine::calcJacobian` (Affine)
- `BundleAdjusterAffinePartial::calcJacobian` (AffinePartial)

**Files:** `stitching/src/stitcher.cpp`, `stitching/src/motion_estimators.cpp`.

---

## Summary

| Quantity | Entry API | Core solver / refinement | Jacobian |
|----------|-----------|---------------------------|----------|
| **H** | `findHomography` | USAC: HomographyEstimator + min/non-min solvers; Legacy: RANSAC/LMeDS/RHO + LM | RHO: `sacCalcJacobianErrors`; Refine: `HomographyRefineCallback::compute` (both analytical) |
| **F** | `findFundamentalMat` | USAC: FundamentalEstimator + 7pt/8pt/LarssonOptimizer; Legacy: RANSAC/LMeDS + runKernel | USAC LO: `refine_relpose` → `RelativePoseJacobianAccumulator` (analytical) |
| **E** | `findEssentialMat` | USAC: EssentialEstimator + 5pt + LarssonOptimizer; Legacy: RANSAC/LMeDS + EMEstimatorCallback | USAC: same `refine_relpose` / RelativePoseJacobianAccumulator (analytical) |
| **BA (calib)** | `calibrateCamera` / `calibrateCameraRO` | `calibrateCameraInternal` + CvLevMarq (updateAlt) | `projectPoints` + `Rodrigues` (analytical) |
| **BA (stitching)** | `Stitcher::estimateTransform` → `bundle_adjuster_->operator()` | `BundleAdjusterBase::estimate` + CvLevMarq (update) | `calcJacobian` (finite differences) |
