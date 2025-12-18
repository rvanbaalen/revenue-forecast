# Changelog

## [2.4.0](https://github.com/rvanbaalen/revenue-forecast/compare/v2.3.0...v2.4.0) (2025-12-18)


### Features

* Add pagination and mobile-friendly filters to transactions list ([#65](https://github.com/rvanbaalen/revenue-forecast/issues/65)) ([4107840](https://github.com/rvanbaalen/revenue-forecast/commit/4107840a21e3485f7bdf7bd278e826f5dc82afe1))


### Bug Fixes

* Create single source of truth for transaction categories ([#63](https://github.com/rvanbaalen/revenue-forecast/issues/63)) ([91ec987](https://github.com/rvanbaalen/revenue-forecast/commit/91ec987544c94598539752a8d5f0e92a555423ff))

## [2.3.0](https://github.com/rvanbaalen/revenue-forecast/compare/v2.2.0...v2.3.0) (2025-12-18)


### Features

* Add context selection and creation during OFX import ([#62](https://github.com/rvanbaalen/revenue-forecast/issues/62)) ([e1ce4dc](https://github.com/rvanbaalen/revenue-forecast/commit/e1ce4dcbe21f130ab8879746be3b02b44f90a899))
* Add manual fiscal year override for transactions ([#59](https://github.com/rvanbaalen/revenue-forecast/issues/59)) ([59d22dc](https://github.com/rvanbaalen/revenue-forecast/commit/59d22dc13732f232da09d9dd335473562fc98841))
* Switch to hash-based routing for GitHub Pages compatibility ([#60](https://github.com/rvanbaalen/revenue-forecast/issues/60)) ([b87a4bc](https://github.com/rvanbaalen/revenue-forecast/commit/b87a4bce10a7b717ac5d68757db23cdc7058cdd9))

## [2.2.0](https://github.com/rvanbaalen/revenue-forecast/compare/v2.1.1...v2.2.0) (2025-12-18)


### Features

* Add balance reconciliation feature ([#57](https://github.com/rvanbaalen/revenue-forecast/issues/57)) ([e027d6d](https://github.com/rvanbaalen/revenue-forecast/commit/e027d6dc51ccce28057a80a3faede008a5cadde8))


### Bug Fixes

* Save LLM-generated rules to Settings for future use ([#58](https://github.com/rvanbaalen/revenue-forecast/issues/58)) ([c8bd852](https://github.com/rvanbaalen/revenue-forecast/commit/c8bd8522742e317961aea5da4457b46ee3634a5b))
* Show error when no context is selected during OFX import ([#55](https://github.com/rvanbaalen/revenue-forecast/issues/55)) ([5a1926c](https://github.com/rvanbaalen/revenue-forecast/commit/5a1926cc5b67b57695c2e437d25f4a03974fff6a))

## [2.1.1](https://github.com/rvanbaalen/revenue-forecast/compare/v2.1.0...v2.1.1) (2025-12-18)


### Bug Fixes

* Ensure Button type="button" default cannot be overridden by spread props ([#53](https://github.com/rvanbaalen/revenue-forecast/issues/53)) ([5f46936](https://github.com/rvanbaalen/revenue-forecast/commit/5f46936ecc956669bd463f50ca0cd9cdbd273515))

## [2.1.0](https://github.com/rvanbaalen/revenue-forecast/compare/v2.0.1...v2.1.0) (2025-12-18)


### Features

* Optimize LLM categorization with ruleset-based approach ([#51](https://github.com/rvanbaalen/revenue-forecast/issues/51)) ([8acaf2e](https://github.com/rvanbaalen/revenue-forecast/commit/8acaf2e955e33cf38dfa71baa35cbece331a9c15))

## [2.0.1](https://github.com/rvanbaalen/revenue-forecast/compare/v2.0.0...v2.0.1) (2025-12-18)


### Bug Fixes

* Add default type="button" to Button component to fix click issues ([#49](https://github.com/rvanbaalen/revenue-forecast/issues/49)) ([acd71f5](https://github.com/rvanbaalen/revenue-forecast/commit/acd71f58352f53912c056c22e0bccf8ed6acb49d))

## [2.0.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.10.0...v2.0.0) (2025-12-18)


### ⚠ BREAKING CHANGES

* Removes old revenue forecasting, salary management, and double-entry accounting features. No backwards compatibility.

### Features

* Redesign financial architecture with OFX focus ([#47](https://github.com/rvanbaalen/revenue-forecast/issues/47)) ([0120350](https://github.com/rvanbaalen/revenue-forecast/commit/0120350b7de1b64e955c02ef6b63e7dac5ef1570))

## [1.10.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.9.0...v1.10.0) (2025-12-18)


### Features

* Add multi-file OFX upload with transfer detection ([#46](https://github.com/rvanbaalen/revenue-forecast/issues/46)) ([75d8a79](https://github.com/rvanbaalen/revenue-forecast/commit/75d8a79c3285ef36017f5b694ede46dbbfe9c919))


### Bug Fixes

* Make Intelligence page tabs mobile-friendly ([#44](https://github.com/rvanbaalen/revenue-forecast/issues/44)) ([eea469c](https://github.com/rvanbaalen/revenue-forecast/commit/eea469c4d396f9a4858934cac95c501b93642721))

## [1.9.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.8.0...v1.9.0) (2025-12-18)


### Features

* Add mobile sidebar support with toggle trigger ([#42](https://github.com/rvanbaalen/revenue-forecast/issues/42)) ([b319f2f](https://github.com/rvanbaalen/revenue-forecast/commit/b319f2f3909789d5ea36cd194ebd0b8f37337ec7))

## [1.8.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.7.0...v1.8.0) (2025-12-18)


### Features

* Redesign revenue forecast vs actual UI ([#40](https://github.com/rvanbaalen/revenue-forecast/issues/40)) ([2cd978c](https://github.com/rvanbaalen/revenue-forecast/commit/2cd978c67ae4dab69d5a5cfd94f54d03676f3353))

## [1.7.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.6.0...v1.7.0) (2025-12-17)


### Features

* Add JSON beautifier tool with configurable presets ([#38](https://github.com/rvanbaalen/revenue-forecast/issues/38)) ([89e9f10](https://github.com/rvanbaalen/revenue-forecast/commit/89e9f101b41f30a19c0454d80b142552cc1d5d3b))
* Review and rename backup and restore functionality ([#36](https://github.com/rvanbaalen/revenue-forecast/issues/36)) ([8dec91c](https://github.com/rvanbaalen/revenue-forecast/commit/8dec91c39b304333c151d8b47d389c29098c1a11))

## [1.6.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.5.2...v1.6.0) (2025-12-13)


### Features

* Create guided wizard for OFX file uploads ([#34](https://github.com/rvanbaalen/revenue-forecast/issues/34)) ([68b0141](https://github.com/rvanbaalen/revenue-forecast/commit/68b01417189fe5e8480e69e1de9d76ddfdb166f2))

## [1.5.2](https://github.com/rvanbaalen/revenue-forecast/compare/v1.5.1...v1.5.2) (2025-12-13)


### Bug Fixes

* refactor sidebar to use shadcn component ([#33](https://github.com/rvanbaalen/revenue-forecast/issues/33)) ([5bede30](https://github.com/rvanbaalen/revenue-forecast/commit/5bede30f0e772c8727011fed7933f7bc87028e13))
* Update charts to use official shadcn/recharts components ([#31](https://github.com/rvanbaalen/revenue-forecast/issues/31)) ([d4c71ae](https://github.com/rvanbaalen/revenue-forecast/commit/d4c71ae2c38788450ebf3d85f49d42bcbb167f6b))

## [1.5.1](https://github.com/rvanbaalen/revenue-forecast/compare/v1.5.0...v1.5.1) (2025-12-13)


### Bug Fixes

* Correct mapping rules application and auto-apply on creation ([#28](https://github.com/rvanbaalen/revenue-forecast/issues/28)) ([674b4b0](https://github.com/rvanbaalen/revenue-forecast/commit/674b4b0dd1de975cfc92b1f98cdccebcbb132f67))

## [1.5.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.4.0...v1.5.0) (2025-12-13)


### Features

* Add category import/export and business type presets ([#22](https://github.com/rvanbaalen/revenue-forecast/issues/22)) ([7a6beef](https://github.com/rvanbaalen/revenue-forecast/commit/7a6beefaf47ea0b0a296ddc9f2b30a799ba554fc))
* Add mapping rules import/export functionality ([#26](https://github.com/rvanbaalen/revenue-forecast/issues/26)) ([191ec19](https://github.com/rvanbaalen/revenue-forecast/commit/191ec1932c3e912cde34afcc74f2b31baa33ce0c))


### Bug Fixes

* Create journal entries for revenue transactions ([#27](https://github.com/rvanbaalen/revenue-forecast/issues/27)) ([52f8bfd](https://github.com/rvanbaalen/revenue-forecast/commit/52f8bfd74bf8f48e234bd42b460b6767edb0dcf2))

## [1.4.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.3.0...v1.4.0) (2025-12-13)


### Features

* Add account types and expense categorization ([#20](https://github.com/rvanbaalen/revenue-forecast/issues/20)) ([e269047](https://github.com/rvanbaalen/revenue-forecast/commit/e269047b95d9de80bc3eaab6d6b805427738a98c))

## [1.3.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.2.0...v1.3.0) (2025-12-12)


### Features

* add OFX bank file import functionality ([#19](https://github.com/rvanbaalen/revenue-forecast/issues/19)) ([ba1575e](https://github.com/rvanbaalen/revenue-forecast/commit/ba1575ef60f7981c647ecad8f18fbaa14457496f))
* install native component versions and document shadcn component installation guidelines ([#17](https://github.com/rvanbaalen/revenue-forecast/issues/17)) ([cad2983](https://github.com/rvanbaalen/revenue-forecast/commit/cad29836f3ff97bc6eecaa554ae5e54b82439b75))

## [1.2.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.1.0...v1.2.0) (2025-12-12)


### Features

* Add time awareness and migrate to shadcn/ui ([#14](https://github.com/rvanbaalen/revenue-forecast/issues/14)) ([c0dc174](https://github.com/rvanbaalen/revenue-forecast/commit/c0dc174fcfa38aa7f710032be9179dfe53eec9a0))

## [1.1.0](https://github.com/rvanbaalen/revenue-forecast/compare/v1.0.2...v1.1.0) (2025-12-11)


### Features

* Add monthly revenue confirmation and client-side routing ([#9](https://github.com/rvanbaalen/revenue-forecast/issues/9)) ([5ec5af1](https://github.com/rvanbaalen/revenue-forecast/commit/5ec5af1139ae0dfb641d6fe96a384776023395aa))

## [1.0.2](https://github.com/rvanbaalen/revenue-forecast/compare/v1.0.1...v1.0.2) (2025-12-11)


### Bug Fixes

* Add npm build step to GitHub Pages deployment ([#7](https://github.com/rvanbaalen/revenue-forecast/issues/7)) ([e82d40b](https://github.com/rvanbaalen/revenue-forecast/commit/e82d40b3b0e04f85247addccf72f1470db2f34ee))

## [1.0.1](https://github.com/rvanbaalen/revenue-forecast/compare/v1.0.0...v1.0.1) (2025-12-11)


### Bug Fixes

* Use relative path for main.tsx to support subdirectory deployment ([#5](https://github.com/rvanbaalen/revenue-forecast/issues/5)) ([b94b127](https://github.com/rvanbaalen/revenue-forecast/commit/b94b1275290d7b9f4b6405f36d153b12d8dac7ad))

## 1.0.0 (2025-12-11)


### Features

* Migrate to React 19 + TypeScript + Tailwind v4 ([#4](https://github.com/rvanbaalen/revenue-forecast/issues/4)) ([d8b503d](https://github.com/rvanbaalen/revenue-forecast/commit/d8b503d1712f6ea026ed5365fc5e9fd3db87bd9a))


### Bug Fixes

* Move GitHub Pages deploy to run after release ([#2](https://github.com/rvanbaalen/revenue-forecast/issues/2)) ([ae16ef9](https://github.com/rvanbaalen/revenue-forecast/commit/ae16ef9e94c19bdde8450ccd93fed03558b25ec2))
