# [2.1.0](https://github.com/narando/nest-xray/compare/v2.0.0...v2.1.0) (2022-09-30)


### Features

* NestJS v9 Compatibility ([#392](https://github.com/narando/nest-xray/issues/392)) ([9b34c04](https://github.com/narando/nest-xray/commit/9b34c043bf6d5343e60670ff3cd2cd1151ed8d4e))

# [2.0.0](https://github.com/narando/nest-xray/compare/v1.5.3...v2.0.0) (2022-01-22)


### Features

* **deps:** support NestJS 8 and @nestjs/axios ([1b15ba7](https://github.com/narando/nest-xray/commit/1b15ba747f98fc2a51c616dd99e137a44b08e298))


### BREAKING CHANGES

* **deps:** Drop support for NestJS <8 and the HttpService from
@nestjs/common. Instead add support for NestJS 8 and the HttpService from
@nestjs/axios.

## [1.5.3](https://github.com/narando/nest-xray/compare/v1.5.2...v1.5.3) (2022-01-12)


### Bug Fixes

* **lib:** typings after upgrading to typescript 4.5 ([faefd16](https://github.com/narando/nest-xray/commit/faefd163a8b316b41445fe86894f4041d25e9e81))

## [1.5.2](https://github.com/narando/nest-xray/compare/v1.5.1...v1.5.2) (2022-01-12)


### Bug Fixes

* **lib:** linting after prettier update ([080c949](https://github.com/narando/nest-xray/commit/080c94989dd2ce639ce7e4b616d98364b083fe4f))

## [1.5.1](https://github.com/narando/nest-xray/compare/v1.5.0...v1.5.1) (2022-01-12)


### Bug Fixes

* support aws xray sdk 3.3.3 ([9e596cd](https://github.com/narando/nest-xray/commit/9e596cd561ba0537d083ff0690dabb78621a564d))
* **test:** broken imports of SegmentEmitter ([39ab6d7](https://github.com/narando/nest-xray/commit/39ab6d72ff8078c3a935ed1478230f71f8edca84))
* **test:** hotpatch regex for subsegments ([e242114](https://github.com/narando/nest-xray/commit/e2421146a1046c6dec1dcbe84287df9efb7996ff))

# [1.5.0](https://github.com/narando/nest-xray/compare/v1.4.2...v1.5.0) (2022-01-12)


### Features

* **deps:** bump to node 16 ([134771b](https://github.com/narando/nest-xray/commit/134771b098c9a657db7c45cb1be11d01baf5dc7c))

## [1.4.2](https://github.com/narando/nest-xray/compare/v1.4.1...v1.4.2) (2020-10-15)


### Bug Fixes

* **env/http:** segment has invalid URL when sampling decision is made ([dda8d58](https://github.com/narando/nest-xray/commit/dda8d58fd8583704dd47fc3230218f5e5ba3b0da))

## [1.4.1](https://github.com/narando/nest-xray/compare/v1.4.0...v1.4.1) (2020-10-12)


### Bug Fixes

* **deps:** update dependency aws-xray-sdk to v3 ([2f87b3d](https://github.com/narando/nest-xray/commit/2f87b3dcc5cc464ba62b82162362a60aa255561f))

# [1.4.0](https://github.com/narando/nest-xray/compare/v1.3.2...v1.4.0) (2020-08-06)


### Bug Fixes

* broken prototype-chain for custom exceptions ([9b9978e](https://github.com/narando/nest-xray/commit/9b9978ef3f6b5f3ea9895c083841de85564ce085))


### Features

* export custom exceptions ([27a381c](https://github.com/narando/nest-xray/commit/27a381c339329128483d49f7cd2fa99f82d2d766))

## [1.3.2](https://github.com/narando/nest-xray/compare/v1.3.1...v1.3.2) (2020-07-17)


### Bug Fixes

* **env/http:** query parameter included twice [#140](https://github.com/narando/nest-xray/issues/140) ([395b42c](https://github.com/narando/nest-xray/commit/395b42ccd97aff8017cea322b874af7d53448ea9))

## [1.3.1](https://github.com/narando/nest-xray/compare/v1.3.0...v1.3.1) (2020-06-08)


### Bug Fixes

* **deps:** remove rimraf from peerDeps ([bb45875](https://github.com/narando/nest-xray/commit/bb45875e9bc843361575c48e39b10b8a194374c9))

# [1.3.0](https://github.com/narando/nest-xray/compare/v1.2.4...v1.3.0) (2020-05-29)


### Features

* **core:** allow setting custom XRay plugins ([c82f824](https://github.com/narando/nest-xray/commit/c82f8248d30282ae8caccbbb9f7559e39091b706))

## [1.2.4](https://github.com/narando/nest-xray/compare/v1.2.3...v1.2.4) (2020-05-29)


### Bug Fixes

* duplicate TracingService instances without configuration ([4d89a75](https://github.com/narando/nest-xray/commit/4d89a75928dbd56c242ece9c8f3ea6c8abb6329e))

## [1.2.3](https://github.com/narando/nest-xray/compare/v1.2.2...v1.2.3) (2020-05-23)


### Bug Fixes

* **client/http:** error when used in context without Segment ([a2b7dd3](https://github.com/narando/nest-xray/commit/a2b7dd3ae1e1bcb1173727d2342d4b7475e61912))

## [1.2.2](https://github.com/narando/nest-xray/compare/v1.2.1...v1.2.2) (2020-05-15)


### Bug Fixes

* **client/http:** TracingService not available in module context ([fcd1566](https://github.com/narando/nest-xray/commit/fcd1566f2d5b2d0d5b421ddcd54f541552f033a7))

## [1.2.1](https://github.com/narando/nest-xray/compare/v1.2.0...v1.2.1) (2020-05-14)


### Bug Fixes

* **client/http:** subsegments get lost in parallel calls ([6f2bdae](https://github.com/narando/nest-xray/commit/6f2bdaee40f57b9f353cdb171c647c52bff12c70))

# [1.2.0](https://github.com/narando/nest-xray/compare/v1.1.1...v1.2.0) (2020-04-15)


### Features

* refactor code to enable multiple environments ([96bec82](https://github.com/narando/nest-xray/commit/96bec82f6cde88702d167760d5d19b9661aedfe3))

## [1.1.1](https://github.com/narando/nest-xray/compare/v1.1.0...v1.1.1) (2020-04-09)


### Bug Fixes

* **http:** ignore missing tracing context in HttpService [#75](https://github.com/narando/nest-xray/issues/75) ([b03160d](https://github.com/narando/nest-xray/commit/b03160d03ee590ab7b416830a58ba8fb0508acc5))
* throw special exception if TracingService is used in unknown context ([688087c](https://github.com/narando/nest-xray/commit/688087c09af4b8a2c95f1a8931f9e8e0b3c88d3b))
* **hooks:** throw named exception if async id is unknown ([cbdbd59](https://github.com/narando/nest-xray/commit/cbdbd59d2c653b7fcc76b9835cdcca2984fe772f))

# [1.1.0](https://github.com/narando/nest-xray/compare/v1.0.1...v1.1.0) (2020-03-14)


### Features

* allow usages with Nestjs v7 ([13e19f0](https://github.com/narando/nest-xray/commit/13e19f0a6750b86034cde4946370a319af267404))

## [1.0.1](https://github.com/narando/nest-xray/compare/v1.0.0...v1.0.1) (2020-01-25)


### Bug Fixes

* **ci:** fix version in package.json ([ff95014](https://github.com/narando/nest-xray/commit/ff95014cc10310520de7931840c95c208ec3b1b4))

# 1.0.0 (2020-01-15)


### Bug Fixes

* **ci:** add missing step to release pipeline ([18d4d69](https://github.com/narando/nest-xray/commit/18d4d69f183cee85b5dc6fa063a392085bea590d))
* **ci:** reference to coverage folder ([b38a3f1](https://github.com/narando/nest-xray/commit/b38a3f1f982f982477e37c9b8d5be5b228741e51))


### Features

* **ci:** add automatic changelog and releases on npm ([262b150](https://github.com/narando/nest-xray/commit/262b1502819af8ba879291b9750d6a55f36b08a3))
* add Github Actions CI ([e3040c5](https://github.com/narando/nest-xray/commit/e3040c593e4b1b504a98d30cb68822254fb387af))
* add initial implementation ([65311a5](https://github.com/narando/nest-xray/commit/65311a5f6a1d124bea7c081d63d5af28d130a4d5))
* add initial project setup ([ff161bc](https://github.com/narando/nest-xray/commit/ff161bcabadd9862479ea1e4d4e18d8db1416101))
* add MIT license ([b201115](https://github.com/narando/nest-xray/commit/b201115839449c68638bf570af9311a8af08c1a4))
