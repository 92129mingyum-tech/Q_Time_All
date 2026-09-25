# Q-TIME Client v0.1.1

자동 업데이트 기능을 처음 포함한 버전입니다. 기존에 설치된 v0.1.0은 이 기능이 없어 **v0.1.1을 한 번 수동으로 설치**해야 합니다.

## 저장소에 반영

공개 저장소 `Q_Time_All`의 최상위에 `package.json`, `client/`, `.github/`, `README.md`, `.gitignore`를 놓습니다. ZIP의 바깥 폴더까지 업로드하지 마세요. 기존 비공개 `Q_time`은 보관용으로 둡니다.

## 배포

1. 저장소 공개 여부가 Public인지 확인합니다. `package.json`의 `build.publish.owner` / `repo`가 실제 GitHub 소유자 및 저장소 이름과 일치해야 합니다.
2. `main`에 코드를 반영합니다. Actions의 빌드가 성공했는지 확인합니다.
3. GitHub에서 `v0.1.1` 태그를 만들어 푸시하거나, Releases에서 새 릴리스를 생성하면서 `v0.1.1` 태그를 만듭니다. 태그가 푸시되면 Actions가 Windows 설치파일과 `latest.yml`을 해당 릴리스에 게시합니다. 릴리스 생성 시 직접 파일을 첨부하지 않습니다.
4. 릴리스 자산에 `Q-TIME-Setup-0.1.1.exe`, `latest.yml`, `.blockmap`이 있는지 확인합니다. v0.1.1 설치파일을 한 번 수동 설치합니다.
5. 다음 테스트에는 `package.json`의 버전과 `client/index.html`의 화면 버전을 `0.1.2`로 바꾸고 `v0.1.2` 태그를 배포합니다. v0.1.1을 실행하면 새 버전을 다운로드하고 재실행해야 합니다.

`main` 푸시의 Actions 아티팩트는 설치파일 빌드 확인용이며 자동 업데이트 배포가 아닙니다. 태그 빌드가 만든 공개 GitHub Release가 업데이트 배포 경로입니다.
