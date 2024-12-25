import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { CampingRepository } from './repository/camping.repository';
import { Camping } from './entities/camping.entity';
import { ApiKeyManager } from 'src/common/utils/api-manager';
import { parseStringPromise } from 'xml2js';
import { CampingParamDto } from './dto/find-camping-param.dto';
import { CampingType } from './type/camping-create.type';

@Injectable()
export class CampingService {
  private apiKeyManager: ApiKeyManager;

  constructor(private readonly campingRepository: CampingRepository) {
    // 수정 필요
    this.apiKeyManager = new ApiKeyManager([
      'xmrpgObsiAFFR2II2Mr%2BABk2SHPyB21kt%2Ft0Y6g4mMndM3J0b3KDmM2TTsySRE6Cpuo0Q8cBNt2aQ5%2BX1woPyA%3D%3D',
      'TapmaDwOM%2FvvIzD2GYx%2F6RfNoMM1ES3NQbgRwQeVG31NEu5JDY7vWU41293qYDR51IrpaKtbgAuYzJseIBhx2A%3D%3D',
      'FZ4frpQMulmr31of%2BdrKJkS9c99ziib5T%2BMJyqhp3kFnAHkw%2FR0URVDqItzaYurITyEJ3B%2BK%2BLtnNNmeVMfYFA%3D%3D',
      'WVXbHaU1Swo%2BcYdMpg2hDAaLjs3Vehe3CBCsgOR63iQf%2FWqVv%2BeuKKq%2Bs8uOhS4%2B1bwL4VwhxS1%2F0WUOgmklag%3D%3D',
      '20ToNqK21emRg6djV5ZFRNzl%2BGVnIEHdUoewEghzPlmop90s0dTK3sSnW%2FjdHqN1fF1lFrE96WK1ypYHhLuS6Q%3D%3D',
      'fR5r78vDyLa5VlMt5YTpJRUGjXoWDMk6ZQmB2LPtYHAHw%2F7mdvoXpnkrz7OuOB2JJH%2FOtbvUbmtUS%2FiPGGwoxQ%3D%3D',
    ]);
  }

  async campingCronHandler() {
    const apiurl = 'https://apis.data.go.kr/B551011/GoCamping';
    const numOfRows = 100;
    let pageNo = 1;
    let allData = [];

    while (true) {
      const apikey = this.apiKeyManager.getCurrentApiKey();
      const url = `${apiurl}/basedList?serviceKey=${apikey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json`;

      try {
        const response = await axios.get(url);
        const responseBody = response.data?.response?.body;

        if (!responseBody || !responseBody.items || responseBody.items === '') {
          console.log(`처리할 데이터가 없습니다 (페이지: ${pageNo})`);
          console.log('응답 데이터:', response.data); // 응답 전체 데이터를 로깅하여 확인

          // 응답이 XML인지 확인
          if (
            response.data &&
            typeof response.data === 'string' &&
            response.data.trim().startsWith('<')
          ) {
            // XML 형식인 경우
            const errorXml = response.data;
            console.log(errorXml, '에러 발생 시');

            try {
              const parsedError = await parseStringPromise(errorXml, {
                explicitArray: false,
              });
              const returnReasonCode =
                parsedError?.OpenAPI_ServiceResponse?.cmmMsgHeader
                  ?.returnReasonCode;

              // 22번 코드 (API 키 초과) 처리
              if (returnReasonCode === '22') {
                console.warn(
                  `API 키 사용 초과: ${apikey}, 이유: ${parsedError?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg}`,
                );

                // API 키 변경 및 재시도
                if (!this.apiKeyManager.switchToNextApiKey()) {
                  console.error('모든 API 키 사용 초과');
                  break;
                }
                console.log(
                  `새로운 API 키로 전환: ${this.apiKeyManager.getCurrentApiKey()}`,
                );
                continue;
              }
            } catch (parseError) {
              console.error('XML 파싱 오류:', parseError);
            }
          } else {
            // JSON 형식이거나 다른 응답
            console.error('응답 데이터가 예상한 XML 형식이 아닙니다.');
          }
          break;
        }

        const campData = responseBody.items.item ?? [];
        console.log(
          `현재 페이지: ${pageNo}, 받은 데이터 수: ${campData.length}`,
        );
        allData = allData.concat(campData);
        pageNo++;
      } catch (error) {
        console.error('데이터 요청 중 오류 발생:', error.message);
        break;
      }
    }

    try {
      const entities = allData.map((item) => this.mapToEntity(item));
      const batchSize = 500; // 한 번에 저장할 데이터 수
      await this.saveDataInBatches(entities, batchSize);
      console.log(`${entities.length}개의 데이터를 성공적으로 저장했습니다.`);
    } catch (error) {
      console.error('데이터 저장 중 오류 발생:', error);
    }
  }

  async saveDataInBatches(
    entities: Camping[],
    batchSize: number,
  ): Promise<void> {
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      await this.campingRepository.saveDataWithTransaction(batch);
    }
  }

  mapToEntity(data: CampingType): Camping {
    const camping = new Camping();
    camping.lineIntro = data.lineIntro ?? null;
    camping.intro = data.intro ?? null;
    camping.factDivNm = data.facltNm ?? null; // 'facltNm'이 API의 이름 필드라 가정
    camping.manageDivNm = data.manageDivNm ?? null;
    camping.bizrno = data.bizrno ?? null;
    camping.manageSttus = data.manageSttus ?? null;
    camping.hvofBgnde = data.hvofBgnde ?? null;
    camping.hvofEndde = data.hvofEndde ?? null;
    camping.featureNm = data.featureNm ?? null;
    camping.induty = data.induty ?? null;
    camping.lccl = data.lctCl ?? null; // 'lctCl'이 API의 환경 필드라 가정
    camping.doNm = data.doNm ?? null;
    camping.signguNm = data.signguNm ?? null;
    camping.addr1 = data.addr1 ?? null;
    camping.addr2 = data.addr2 ?? null;
    camping.setLocation(data.mapX, data.mapY);
    camping.tel = data.tel ?? null;
    camping.homepage = data.homepage ?? null;
    camping.gplnInnerFclty = data.gnrlSiteCo ?? null;
    camping.caravnInnerFclty = data.caravInnerFclty ?? null;
    camping.operPdCl = data.operPdCl ?? null;
    camping.operDeCl = data.operDeCl ?? null;
    camping.trlerAcmpnyAt = data.trlerAcmpnyAt ?? null;
    camping.caravAcmpnyAt = data.caravAcmpnyAt ?? null;
    camping.sbrsCl = data.sbrsCl ?? null;
    camping.toiletCo = data.toiletCo ?? null;
    camping.swrmCo = data.swrmCo ?? null;
    camping.posblFcltyCl = data.posblFcltyCl ?? null;
    camping.themaEnvrnCl = data.themaEnvrnCl ?? null;
    camping.eqpmnLendCl = data.eqpmnLendCl ?? null;
    camping.animalCmgCl = data.animalCmgCl ?? null;
    camping.contentId = data.contentId ?? null;

    return camping;
  }

  async findAllForCron() {
    return await this.campingRepository.findAllForCron();
  }
  async findAllWithDetails() {
    return await this.campingRepository.findAllWithDetails();
  }

  async findOne(paramDto: CampingParamDto) {
    return await this.campingRepository.findOne(paramDto);
  }
  async findNearbycamping(lon: number, lat: number) {
    return await this.campingRepository.findNearbycamping(lon, lat);
  }
}
