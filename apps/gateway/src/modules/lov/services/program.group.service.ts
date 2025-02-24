import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ProgramGroupAddDTO,
  ProgramGroupAddDTOResponse,
} from '@/lov/dto/program.group.add.dto';
import { ProgramGroupDeleteDTOResponse } from '@/lov/dto/program.group.delete.dto';
import {
  ProgramGroupEditDTO,
  ProgramGroupEditDTOResponse,
} from '@/lov/dto/program.group.edit.dto';
import {
  ProgramGroup,
  ProgramGroupDocument,
} from '@/lov/models/program.group.model';

@Injectable()
export class ProgramGroupService {
  constructor(
    @InjectModel(ProgramGroup.name)
    private programGroupModel: Model<ProgramGroupDocument>,
  ) {
    //
  }

  async get_program_group(param: any): Promise<any> {
    const filter_set = JSON.parse(param.filter);
    const sort_set = JSON.parse(param.sort);
    const skip: number = parseInt(param.skip);
    const limit: number = parseInt(param.limit);
    const filter_builder: any = {};
    for (const a in filter_set) {
      if (filter_builder[a] === undefined) {
        filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
      }
      filter_builder[a] = new RegExp(`${filter_set[a]}`, 'i');
    }

    const data = this.programGroupModel
      .find(filter_builder)
      .skip(skip)
      .limit(limit)
      .sort(sort_set)
      .collation({locale: "en",caseLevel: true})
      .exec()
      .then((results) => {
        if (results.length > 0) {
          return {
            total: results.length,
            data: results,
          };
        } else {
          return {
            total: 0,
            data: [],
          };
        }
      });

    return data;
  }

  async addProgramGroup(
    data: ProgramGroupAddDTO,
  ): Promise<ProgramGroupAddDTOResponse> {
    const newBank = new this.programGroupModel(data);
    const process = newBank.save().then(async (returning) => {
      return await returning;
    });

    const response = new ProgramGroupAddDTOResponse();
    if (process) {
      response.message = 'ProgramGroup Created Successfully';
      response.status = HttpStatus.OK;
      response.payload = newBank;
    } else {
      response.message = 'Bank Failed to Created';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async editProgramGroup(
    data: ProgramGroupEditDTO,
    param: string,
  ): Promise<ProgramGroupEditDTOResponse> {
    const process = this.programGroupModel
      .findOneAndUpdate(
        { _id: param },
        {
          group_name: data.group_name,
        },
      )
      .then((results) => {
        return results;
      });

    const response = new ProgramGroupEditDTOResponse();
    if (process) {
      response.message = 'Program Group Updated Successfully';
      response.status = HttpStatus.OK;
      response.payload = process;
    } else {
      response.message = 'Bank Failed to Updated';
      response.status = 400;
      response.payload = process;
    }
    return response;
  }

  async deleteBank(param: string): Promise<ProgramGroupDeleteDTOResponse> {
    const process = this.programGroupModel
      .findOneAndDelete({ _id: param }, { deleted_at: Date.now() })
      .then((results) => {
        return results;
      });

    const response = new ProgramGroupDeleteDTOResponse();
    if (process) {
      response.status = HttpStatus.OK;
      response.message = 'Program Group Deleted Successfully';
      response.payload = process
    } else {
      response.status = 400;
      response.message = 'Program Group Failed to Deleted';
      response.payload = process
    }
    return response;
  }
}
