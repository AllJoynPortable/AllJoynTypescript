namespace AJ {
        enum Endianness {
        LittleEndian,
        BigEndian
    };

    export enum MsgType {
        MethodCall,
        MethodReturn,
        Error,
        Signal,

        Unknown
    }

    enum FieldType {
        Path = 1,
        Interface = 2,
        Member = 3,
        ErrorName = 4,
        ReplySerial = 5,
        Destination = 6,
        Sender = 7,
        Signature = 8
    }

    export class MsgGeneric {

        /* ------------------------------------------------------------------------------------------------------- */
        /*  CONSTRUCTORS                                                                                           */
        /* ------------------------------------------------------------------------------------------------------- */

        constructor(t: MsgType) {
            // just small buffer initially

            if (t != MsgType.Unknown) {
                this.m_Data = new Uint8Array(128);

                this.hdr_SetEndianness(Endianness.LittleEndian);
                this.hdr_SetMsgType(t);
                this.hdr_SetMajorVersion(0x00);
                this.hdr_SetBodyLength(0);
                this.hdr_SetHeaderLength(0);
                this.hdr_SetSerialNumber(MsgGeneric.m_NextSerialNumber++);
            }
            else {
                this.m_Data = null;
            }
        }

        public FromBuffer(bytes: Uint8Array): number {
            if (bytes.length >= 16) {
                console.log(bytes);
                this.m_Data = bytes;
                var length = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
                console.log("length : " + length);
                if ((bytes.length >= length) && (length < 1024)) {
                    this.m_Data = new Uint8Array(length);
                    if (bytes.length == length) {
                        this.m_Data.set(bytes);
                    } else {
                        this.m_Data.set(bytes.subarray(0, length));
                    }
                    return length;
                }
            }
            this.m_Data = null;
            return 0;
        }

        public CreateReply() {
            this.m_Reply = new MsgGeneric(MsgType.MethodReturn);

            this.m_Reply.hdr_SetDestination(this.hdr_GetSender());
            this.m_Reply.hdr_SetSender(this.hdr_GetDestination());
            this.m_Reply.hdr_SetReplySerial(this.hdr_GetSerialNumber());
        }

        /* ------------------------------------------------------------------------------------------------------- */
        /*  PUBLIC MESSAGE HEADERS INTERFACE                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */

        public hdr_GetEndianness(): Endianness {
            return (this.m_Data[0] == 0x6c) ? Endianness.LittleEndian : Endianness.BigEndian;
        }

        public hdr_SetEndianness(value: Endianness) {
            if (value == Endianness.LittleEndian) this.m_Data[0] = 0x6c;
            else this.m_Data[0] = 0x42;
        }

        public hdr_GetMsgType(): MsgType {
            if (this.m_Data.length >= 16) {
                switch (this.m_Data[1]) {
                    case 0: return MsgType.Unknown;
                    case 1: return MsgType.MethodCall;
                    case 2: return MsgType.MethodReturn;
                    case 3: return MsgType.Error;
                    case 4: return MsgType.Signal;
                }
            }

            return MsgType.Unknown;
        }

        public hdr_SetMsgType(value: MsgType) {
            switch (value) {
                case MsgType.MethodCall: this.m_Data[1] = 1; break;
                case MsgType.MethodReturn: this.m_Data[1] = 2; break;
                case MsgType.Error: this.m_Data[1] = 3; break;
                case MsgType.Signal: this.m_Data[1] = 4; break;
                default: this.m_Data[1] = 0; break;
            }
        }

        public hdr_GetNoReplyExpected(): boolean {
            return (0 != (this.m_Data[2] & 0x01));
        }

        public hdr_SetNoReplyExpected(value: boolean) {
            if (value) this.SetFlag(0x01); else this.ClearFlag(0x01);
        }

        public hdr_GetAutoStart(): boolean {
            return (0 != (this.m_Data[2] & 0x02));
        }

        public hdr_SetAutoStart(value: boolean) {
            if (value) this.SetFlag(0x02); else this.ClearFlag(0x02);
        }

        public hdr_GetAllowRemoteMsg(): boolean {
            return (0 != (this.m_Data[2] & 0x04));
        }

        public hdr_SetAllowRemoteMsg(value: boolean) {
            if (value) this.SetFlag(0x04); else this.ClearFlag(0x04);
        }

        public hdr_GetSessionless(): boolean {
            return (0 != (this.m_Data[2] & 0x10));
        }

        public hdr_SetSessionless(value: boolean) {
            if (value) this.SetFlag(0x10); else this.ClearFlag(0x10);
        }

        public hdr_GetGlobalBroadcast(): boolean {
            return (0 != (this.m_Data[2] & 0x20));
        }

        public hdr_SetGlobalBroadcast(value: boolean) {
            if (value) this.SetFlag(0x20); else this.ClearFlag(0x20);
        }

        public hdr_GetCompressed(): boolean {
            return (0 != (this.m_Data[2] & 0x40));
        }

        public hdr_SetCompressed(value: boolean) {
            if (value) this.SetFlag(0x40); else this.ClearFlag(0x40);
        }

        public hdr_GetEncrypted(): boolean {
            return (0 != (this.m_Data[2] & 0x80));
        }

        public hdr_SetEncrypted(value: boolean) {
            if (value) this.SetFlag(0x80); else this.ClearFlag(0x80);
        }


        public hdr_GetMajorVersion(): number {
            return this.m_Data[3];
        }

        public hdr_SetMajorVersion(value: number) {
            this.m_Data[3] = value;
        }

        public hdr_GetBodyLength(): number {
            return this.GetUintAt(4);
        }

        public hdr_SetBodyLength(value: number) {
            this.SetUintAt(4, value);
        }

        public hdr_GetSerialNumber(): number {
            return this.GetUintAt(8);
        }

        public hdr_SetSerialNumber(value: number) {
            this.SetUintAt(8, value);
        }

        public hdr_GetHeaderLength(): number {
            return this.GetUintAt(12);
        }

        public hdr_SetHeaderLength(value: number) {
            this.SetUintAt(12, value);
        }

        public hdr_GetObjectPath(): string {
            return this._ExtractFieldFromHeader(FieldType.Path);
        }

        public hdr_SetObjectPath(value: string) {
            this.AddField(FieldType.Path, value);
        }

        public hdr_GetInterface(): string {
            return this._ExtractFieldFromHeader(FieldType.Interface);
        }

        public hdr_SetInterface(value: string) {
            this.AddField(FieldType.Interface, value);
        }

        public hdr_GetMember(): string {
            return this._ExtractFieldFromHeader(FieldType.Member);
        }

        public hdr_SetMember(value: string) {
            this.AddField(FieldType.Member, value);
        }

        public hdr_GetDestination(): string {
            return this._ExtractFieldFromHeader(FieldType.Destination);
        }

        public hdr_SetDestination(value: string) {
            this.AddField(FieldType.Destination, value);
        }

        public hdr_GetSender(): string {
            return this._ExtractFieldFromHeader(FieldType.Sender);
        }

        public hdr_SetSender(value: string) {
            this.AddField(FieldType.Sender, value);
        }

        public hdr_GetReplySerial(): number {
            var o: any = this._ExtractFieldFromHeader(FieldType.ReplySerial);
            return (null != o) ? o : 0;
        }

        public hdr_SetReplySerial(value: number) {
            this.AddField(FieldType.ReplySerial, value);
        }

        public hdr_GetSignature(): string {
            return this._ExtractFieldFromHeader(FieldType.Signature);
        }

        public hdr_SetSignature(value: string) {
            this.AddField(FieldType.Signature, value);
        }

        public hdr_GetErrorName(): string {
            return this._ExtractFieldFromHeader(FieldType.ErrorName);
        }

        public hdr_SetErrorName(value: string) {
            this.AddField(FieldType.ErrorName, value);
        }

        /* ------------------------------------------------------------------------------------------------------- */
        /*  WRITING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        public body_StartWriting() {
            this.m_WritingBody = true;
            this.m_position = 16 + this.RoundedHeaderLength();
        }

        public body_Write_Y(v: number) {
            this.EnsureBufferSize(1);
            this.SetByteAt(this.m_position++, v);
            this.body_UpdateLength();
        }

        public body_Write_B(v: boolean) {
            this.body_Write_I(v ? 1 : 0);
        }

        public body_Write_N(v: number) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);

            this.m_position += 2;

            this.body_UpdateLength();
        }

        public body_Write_Q(v: number) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);

            this.m_position += 2;

            this.body_UpdateLength();
        }

        public body_Write_I(v: number) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);

            this.m_position += 4;

            this.body_UpdateLength();
        }

        public body_Write_U(v: number) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);

            this.m_position += 4;

            this.body_UpdateLength();
        }

        public body_Write_S(v: string) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4 + 1);

            this.SetUintAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 4, v);

            this.m_position += 4 + v.length + 1;

            this.body_UpdateLength();
        }

        public body_Write_O(v: string) {
            this.body_Write_S(v);
        }

        public body_Write_G(v: string) {
            this.EnsureBufferSize(1 + v.length + 1);

            this.SetByteAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 1, v);

            this.m_position += 1 + v.length + 1;

            this.body_UpdateLength();
        }

        public body_Write_AY(v: Uint8Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4);

            this.SetUintAt(this.m_position, v.length);
            this.SetBytesAt(this.m_position + 4, v);

            this.m_position += 4 + v.length;

            this.body_UpdateLength();
        }

        public body_Write_AN(v: Int16Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);

            this.body_Write_U(v.length * 2);

            for (var i: number = 0; i < v.length; i++) {
                // XXX - make sure it's converted correctly
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }

            this.m_position += v.length * 2;

            this.body_UpdateLength();
        }

        public body_Write_AQ(v: Uint16Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);

            this.body_Write_U(v.length * 2);

            for (var i: number = 0; i < v.length; i++) {
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }

            this.m_position += v.length * 2;

            this.body_UpdateLength();
        }

        public body_Write_AI(v: Int32Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);

            this.body_Write_U(v.length * 4);

            for (var i: number = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }

            this.m_position += v.length * 4;

            this.body_UpdateLength();
        }

        public body_Write_AU(v: Uint32Array) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);

            this.body_Write_U(v.length * 4);

            for (var i: number = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }

            this.m_position += v.length * 4;

            this.body_UpdateLength();
        }

        public body_Write_R_Start() {
            this.Align(8);
        }

        private m_array_nesting = -1;
        private m_array_position: Array<number> = new Array<number>(10);

        public body_Write_A_Start() {
            this.Align(4); // XXX - is this correct?

            // store beginning of the array position
            this.m_array_position[++this.m_array_nesting] = this.m_position;

            // and write array size, for now it's going to be 0
            this.body_Write_U(0);
        }

        public body_Write_A_End(eight_byte_padding: boolean) {
            // XXX - take care about element alignment
            var temp_position: number = this.m_position;
            var padding_offset: number = 0;

            /* go back to the beginning of the array, so we can write size */
            this.m_position = this.m_array_position[this.m_array_nesting];

            if (eight_byte_padding) {
                if ((this.m_position + 4) % 8 != 0)
                    padding_offset = 4;
            }

            /* calculate array size */
            this.SetUintAt(this.m_position, temp_position - (this.m_array_position[this.m_array_nesting] + 4 + padding_offset));

            /* restore position */
            this.m_position = temp_position;
            this.m_array_nesting--;
        }

        public body_Write_V(v: any, sig: string) {
            this.body_Write_G(sig);
            this.body_WriteObject(sig, v);
        }

        public body_WriteRaw(data: Uint8Array) {
            this.EnsureBufferSize(data.length);
            this.SetBytesAt(this.m_position, data);
            this.m_position += data.length;
            this.body_UpdateLength();
        }

        public body_WriteObject(sig: string, v: any) {
            switch (sig) {
                case "s":
                case "o":
                    this.body_Write_S(v);
                    return;
                case "g": this.body_Write_G(v); return;
                case "b": this.body_Write_B(v); return;
                case "y": this.body_Write_Y(v); return;
                case "n": this.body_Write_N(v); return;
                case "q": this.body_Write_Q(v); return;
                case "i": this.body_Write_I(v); return;
                case "u": this.body_Write_U(v); return;
                case "ay": this.body_Write_AY(v); return;
                case "an": this.body_Write_AN(v); return;
                case "aq": this.body_Write_AQ(v); return;
                case "ai": this.body_Write_AI(v); return;
                case "au": this.body_Write_AU(v); return;
            }

            if (sig[0] == 'a') {
                this.body_Write_A_Start();

                if (sig[1] == '{') {
                    var d: Array<any> = v;

                    for (var k of d) {
                        this.body_WriteObject(MsgGeneric.GetSubSignature(sig, 1), k);
                    }
                }
                else {
                    var l: Array<any> = v;

                    for (var o of l) {
                        this.body_WriteObject(MsgGeneric.GetSubSignature(sig, 1), o);
                    }
                }

                this.body_Write_A_End((sig[1] == '{') || (sig[1] == '('));
            }
            else if (sig[0] == '{') {
                // XXX - keyvalue pair will be array with 2 elemenst for now
                var kv: Array<any> = v as Array<any>;

                this.Align(8);

                var ss: string = MsgGeneric.GetSubSignature(sig, 1);
                this.body_WriteObject(ss, kv[0]);
                ss = MsgGeneric.GetSubSignature(sig, 1 + ss.length);
                this.body_WriteObject(ss, kv[1]);
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var idx: number = 1;

                for (var o of (v as Array<any>)) {
                    var ss: string = MsgGeneric.GetSubSignature(sig, idx);
                    idx += ss.length;
                    this.body_WriteObject(ss, o);
                }
            }
            else if (sig == "v") {
                if (typeof (v) == "string") {
                    this.body_Write_V(v, "s");
                }
                else {
                    this.body_Write_V("DUPA!!!!", "s");
                }
            }
        }

        private body_UpdateLength() {
            if (this.m_WritingBody) {
                this.hdr_SetBodyLength(this.m_position - (16 + this.RoundedHeaderLength()));
            }
        }

        public body_Write_AS(v: Array<any>) {
            this.body_Write_A_Start();
            for (var k of v) this.body_Write_S(k);
            this.body_Write_A_End(false);
        };


        public body_Write_ROAS(v: Array<any>) {
            this.Align(8);
            this.body_Write_O(v[0]);
            this.body_Write_AS(v[1]);
        };


        public body_Write_AROAS(v: Array<any>) {
            this.body_Write_A_Start();
            for (var k of v) this.body_Write_ROAS(k);
            this.body_Write_A_End(true);
        };




        /* ------------------------------------------------------------------------------------------------------- */
        /*  READING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        public body_StartReading() {
            this.m_position = 16 + this.RoundedHeaderLength();
        }

        public body_Read_Y(): number {
            return this.GetByteAt(this.m_position++);
        }

        public body_Read_B(): boolean {
            return (0 != this.body_Read_I());
        }

        public body_Read_N(): number {
            this.Align(2);

            var ret: number = this.GetUint16At(this.m_position);
            if (ret > 0x7fff) ret -= 0x10000;
            this.m_position += 2;
            return ret;
        }

        public body_Read_Q(): number {
            this.Align(2);

            var ret: number = this.GetUint16At(this.m_position);
            this.m_position += 2;
            return ret;
        }

        public body_Read_I(): number {
            this.Align(4);

            var ret: number = this.GetUintAt(this.m_position);
            if (ret > 0x7fffffff) ret -= 0x100000000;
            this.m_position += 4;
            return ret;
        }

        public body_Read_U(): number {
            this.Align(4);

            var ret: number = this.GetUintAt(this.m_position);
            this.m_position += 4;
            return ret;
        }

        public body_Read_S(): string {
            var arr: Int8Array = this.body_Read_AY();

            // XXX - strings are null terminated, so increment position
            this.m_position++;

            return String.fromCharCode.apply(null, arr);
        }

        public body_Read_G(): string {
            var length: number = this.body_Read_Y();

            if (this.m_position + length <= this.m_Data.length) {
                var buffer: Int8Array = new Int8Array(length);

                for (var i: number = 0; i < length; i++) { buffer[i] = this.m_Data[this.m_position++]; }

                // XXX - strings are null terminated, so increment position
                this.m_position++;

                return String.fromCharCode.apply(null, buffer);

            }

            return "";
        }

        public body_ReadArrayLength(): number {
            return this.body_Read_I();
        }

        public body_Read_AY(): Uint8Array {
            var length: number = this.body_Read_I();
            var ret: Uint8Array = null;

            if (this.m_position + length <= this.m_Data.length) {
                ret = new Uint8Array(length);

                for (var i: number = 0; i < length; i++) { ret[i] = this.m_Data[this.m_position++]; }
            }

            return ret;
        }

        public body_Read_AN(): Int16Array {
            var length: number = this.body_Read_I();

            var ret = new Int16Array(length / 2);

            for (var i: number = 0; i < length / 2; i++) { ret[i] = this.body_Read_N(); }

            return ret;
        }

        public body_Read_AQ(): Uint16Array {
            var length: number = this.body_Read_I();

            var ret: Uint16Array = new Uint16Array(length / 2);

            for (var i: number = 0; i < length / 2; i++) { ret[i] = this.body_Read_Q(); }

            return ret;
        }

        public body_Read_AI(): Int32Array {
            var length: number = this.body_Read_I();

            var ret: Int32Array = new Int32Array(length / 4);

            for (var i: number = 0; i < length / 4; i++) { ret[i] = this.body_Read_I(); }

            return ret;
        }

        public body_Read_AU(): Uint32Array {
            var length: number = this.body_Read_I();

            var ret: Uint32Array = new Uint32Array(length / 4);

            for (var i: number = 0; i < length / 4; i++) { ret[i] = this.body_Read_U(); }

            return ret;
        }

        public body_ReadObject(sig: string): any {
            switch (sig) {
                case "s":
                case "o":
                    return this.body_Read_S();
                case "g": return this.body_Read_G();
                case "b": return this.body_Read_B();
                case "y": return this.body_Read_Y();
                case "n": return this.body_Read_N();
                case "q": return this.body_Read_Q();
                case "i": return this.body_Read_I();
                case "u": return this.body_Read_U();
                case "ay": return this.body_Read_AY();
                case "an": return this.body_Read_AN();
                case "aq": return this.body_Read_AQ();
                case "ai": return this.body_Read_AI();
                case "au": return this.body_Read_AU();
            }

            if (sig[0] == 'a') {
                var size: number = this.body_ReadArrayLength();
                var end: number = this.m_position + size;
                var ss: string = MsgGeneric.GetSubSignature(sig, 1);

                if (ss[0] == '{') {
                    var ret: Array<any> = new Array<any>();

                    while (this.m_position < end) {
                        var kv: Array<any> = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }
                else {
                    // XXX - now it's the same as in case of a{
                    var ret: Array<any> = new Array<any>();

                    while (this.m_position < end) {
                        var kv: Array<any> = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }

                return ret;
            }
            else if (sig[0] == '{') {
                this.Align(8);

                var subSignature: string = MsgGeneric.GetSubSignature(sig, 1);

                var k: any = this.body_ReadObject(subSignature);
                subSignature = MsgGeneric.GetSubSignature(sig, 1 + subSignature.length);
                var v: any = this.body_ReadObject(subSignature);

                var ret: Array<any> = new Array<any>(2);
                ret[0] = k;
                ret[1] = v;
                return ret;
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var ret: Array<any> = new Array<any>();

                var subSignature: string = "";
                var idx: number = 1;

                while (sig[idx + subSignature.length] != ')') {
                    idx += subSignature.length;
                    subSignature = MsgGeneric.GetSubSignature(sig, idx);

                    ret.push(this.body_ReadObject(subSignature));
                }

                return ret;
            }
            else if (sig == "v") {
                return this.body_Read_V();
            }
        }

        public body_Read_V(): any {
            var sig: string = this.body_Read_G();
            return this.body_ReadObject(sig);
        }

        public body_Read_AS(): Array<any> {
            var length: number = this.body_Read_I();
            var end: number = this.m_position + length;
            var ret: Array<any> = new Array<any>();
            while (this.m_position < end)
                ret.push(this.body_Read_S());
            return ret;
        };




        //    /* ------------------------------------------------------------------------------------------------------- */
        //    /*  OTHER THINGS                                                                                           */
        //    /* ------------------------------------------------------------------------------------------------------- */

        //    public MsgGeneric Reply
        //{
        //    get; set;
        //}

        /* ------------------------------------------------------------------------------------------------------- */
        /*  INTERNAL HEADER ACCESS IMPLEMENTATION                                                                  */
        /* ------------------------------------------------------------------------------------------------------- */

        private SetFlag(flag: number) {
            this.m_Data[2] |= flag;
        }

        private ClearFlag(flag: number) {
            this.m_Data[2] &= ~flag;
        }

        public SetFlags(f: number) {
            this.m_Data[2] = f;
        }

        private _ExtractFieldFromHeader(t: FieldType): any {
            var temp_position: number = this.m_position;
            var o = this._ExtractFieldFromHeaderX(t);
            this.m_position = temp_position;
            return o;
        }

        private _ExtractFieldFromHeaderX(t: FieldType): any {
            this.m_position = 16;

            while (this.m_position < 16 + this.RoundedHeaderLength()) {
                var field: FieldType = this.body_Read_Y();
                var signature: string = this.body_Read_G();

                switch (field) {
                    case FieldType.Path:
                        if (signature != "o") return null;
                        break;
                    case FieldType.Interface:
                    case FieldType.Member:
                    case FieldType.Destination:
                    case FieldType.Sender:
                    case FieldType.ErrorName:
                        if (signature != "s") return null;
                        break;
                    case FieldType.Signature:
                        if (signature != "g") return null;
                        break;
                    case FieldType.ReplySerial:
                        if (signature != "u") return null;
                        break;

                    default:
                        return null;
                }

                var str: any = null;

                if (FieldType.ReplySerial == field) {
                    str = this.body_Read_U();
                }
                else if (FieldType.Signature == field) {
                    str = this.body_Read_G();
                }
                else {
                    str = this.body_Read_S();
                }

                // if field is member then return string
                if (t == field)
                    return str;

                this.body_Write_R_Start();
            }

            return null;
        }


        private AddField(t: FieldType, v: any) {
            // can't add fields if body is already started (for simplicity)
            if (this.hdr_GetBodyLength() > 0)
                return;

            this.m_position = 16 + this.RoundedHeaderLength();

            this.EnsureBufferSize(128);

            switch (t) {
                case FieldType.Path: this.m_Data[this.m_position] = 0x01; break;
                case FieldType.Interface: this.m_Data[this.m_position] = 0x02; break;
                case FieldType.Member: this.m_Data[this.m_position] = 0x03; break;
                case FieldType.Destination: this.m_Data[this.m_position] = 0x06; break;
                case FieldType.Sender: this.m_Data[this.m_position] = 0x07; break;
                case FieldType.Signature: this.m_Data[this.m_position] = 0x08; break;
                case FieldType.ErrorName: this.m_Data[this.m_position] = 0x04; break;
                case FieldType.ReplySerial: this.m_Data[this.m_position] = 0x05; break;
            }

            this.m_position++;

            if (t == FieldType.Path) {
                this.body_Write_V(v, "o");
            }
            else if (t == FieldType.Signature) {
                this.body_Write_V(v, "g");
            }
            else if (t == FieldType.ReplySerial) {
                this.body_Write_V(v, "u");
            }
            else {
                this.body_Write_V(v, "s");
            }

            this.hdr_SetHeaderLength(this.m_position - 16);
        }

        private SetByteAt(idx: number, b: number) {
            this.m_Data[idx] = b;
        }

        private SetUintAt(idx: number, u: number) {
            this.m_Data[idx] = (u & 0xff);
            this.m_Data[idx + 1] = ((u >> 8) & 0xff);
            this.m_Data[idx + 2] = ((u >> 16) & 0xff);
            this.m_Data[idx + 3] = ((u >> 24) & 0xff);
        }

        private SetUint16At(idx: number, u: number) {
            this.m_Data[idx] = (u & 0x0ff);
            this.m_Data[idx + 1] = ((u & 0x0ff00) >> 8);
        }

        private SetStringAt(idx: number, s: string) {
            var length: number = s.length;

            for (var i: number = 0; i < length; i++) {
                this.m_Data[idx + i] = s.charCodeAt(i);
            }

            this.m_Data[idx + length] = 0;
        }

        private SetBytesAt(idx: number, data: Uint8Array) {
            this.m_Data.set(data, idx);
        }

        private GetByteAt(idx: number): number {
            if (idx + 1 <= this.m_Data.length) {
                return this.m_Data[idx];
            }
            else {
                return 0;
            }
        }

        private GetUintAt(idx: number): number {
            if (idx + 4 <= this.m_Data.length) {
                return this.m_Data[idx] +
                    (this.m_Data[idx + 1]) * 256 +
                    (this.m_Data[idx + 2]) * 256 * 256 +
                    (this.m_Data[idx + 3]) * 256 * 256 * 256;
            }
            else {
                return 0;
            }
        }

        private GetUint16At(idx: number): number {
            if (idx + 2 <= this.m_Data.length) {
                return this.m_Data[idx] + this.m_Data[idx + 1] * 256;
            }
            else {
                return 0;
            }
        }


        private RoundedHeaderLength(): number {
            return Math.floor((this.hdr_GetHeaderLength() + 7) / 8) * 8;
        }


        public GetBuffer(): Uint8Array {
            var length: number = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
            return this.m_Data.subarray(0, length);
        }

        public GetBodyBuffer(): Uint8Array {
            var idx = 16 + this.RoundedHeaderLength();
            var length: number = this.hdr_GetBodyLength();
            return this.m_Data.subarray(idx, length);
        }

        private m_position: number;
        private m_WritingBody: boolean = false;

        private Align(alignment: number) {
            this.m_position = Math.floor((this.m_position + alignment - 1) / alignment) * alignment;
        }

        private EnsureBufferSize(size: number) {
            size += this.m_position;

            if (size <= this.m_Data.length)
                return;

            var nb: Uint8Array = new Uint8Array(size);
            nb.set(this.m_Data);
            this.m_Data = nb;
        }

        /* ------------------------------------------------------------------------------------------------------- */
        /*  SIGNATURE HELPER                                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */

        public static ValidateSignature(signature: string, single: boolean): boolean {
            if ((null == signature) || (0 == signature.length))
                return false;

            var count: number = 0;
            var idx: number = 0;


            while (idx < signature.length) {
                var ss: string = MsgGeneric.GetSubSignature(signature, idx);

                if (null == ss)
                    return false;

                idx += ss.length;
                count++;
            }

            if (single && (count > 1))
                return false;

            return true;
        }

        public static GetSubSignature(signature: string, idx: number): string {
            var end: number = MsgGeneric.GetSubSignatureEnd(signature, idx);

            if (end > 0) {
                return signature.substring(idx, end);
            }
            else {
                return null;
            }
        }

        public static GetSubSignatureEnd(signature: string, idx: number): number {
            // check if index is correct in first place
            if ((null == signature) || (idx >= signature.length) || (idx < 0))
                return -1;

            switch (signature[idx]) {
                case 'y':
                case 'n':
                case 'q':
                case 'i':
                case 'u':
                case 's':
                case 'o':
                case 'g':
                case 'x':
                case 't':
                case 'd':
                case 'b':
                case 'v':
                    return idx + 1;

                case '(':

                    idx++;

                    while (idx > 0) {
                        idx = MsgGeneric.GetSubSignatureEnd(signature, idx);

                        if (idx > 0) {
                            if (idx >= signature.length) {
                                idx = -1;
                                break;
                            }
                            else if (signature[idx] == ')') {
                                idx++;
                                break;
                            }
                        }
                    }

                    return idx;

                case 'a':
                    return MsgGeneric.GetSubSignatureEnd(signature, idx + 1);

                case '{':
                    idx = MsgGeneric.GetSubSignatureEnd(signature, idx + 1);

                    if (idx > 0) {
                        idx = MsgGeneric.GetSubSignatureEnd(signature, idx);

                        if (idx > 0) {
                            if ((idx >= signature.length) || (signature[idx] != '}')) {
                                idx = -1;
                            }
                            else {
                                idx++;
                            }
                        }
                    }

                    return idx;

                default:
                    return -1;
            }
        }

        private m_Data: Uint8Array = null;
        public m_Reply: MsgGeneric = null;
        public m_ReplyCb: any = null;
        private static m_NextSerialNumber: number = Math.floor(Math.random() * 32000);

    }
};