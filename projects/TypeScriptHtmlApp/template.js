var AJ;
(function (AJ) {
    //==============================================================================================================
    // FIXED IMPLEMENTATION BELOW
    //==============================================================================================================
    var Endianness;
    (function (Endianness) {
        Endianness[Endianness["LittleEndian"] = 0] = "LittleEndian";
        Endianness[Endianness["BigEndian"] = 1] = "BigEndian";
    })(Endianness || (Endianness = {}));
    ;
    (function (MsgType) {
        MsgType[MsgType["MethodCall"] = 0] = "MethodCall";
        MsgType[MsgType["MethodReturn"] = 1] = "MethodReturn";
        MsgType[MsgType["Error"] = 2] = "Error";
        MsgType[MsgType["Signal"] = 3] = "Signal";
        MsgType[MsgType["Unknown"] = 4] = "Unknown";
    })(AJ.MsgType || (AJ.MsgType = {}));
    var MsgType = AJ.MsgType;
    var FieldType;
    (function (FieldType) {
        FieldType[FieldType["Path"] = 1] = "Path";
        FieldType[FieldType["Interface"] = 2] = "Interface";
        FieldType[FieldType["Member"] = 3] = "Member";
        FieldType[FieldType["ErrorName"] = 4] = "ErrorName";
        FieldType[FieldType["ReplySerial"] = 5] = "ReplySerial";
        FieldType[FieldType["Destination"] = 6] = "Destination";
        FieldType[FieldType["Sender"] = 7] = "Sender";
        FieldType[FieldType["Signature"] = 8] = "Signature";
    })(FieldType || (FieldType = {}));
    var g_NextSerialNumber = Math.floor(Math.random() * 32000);
    var MsgGeneric = (function () {
        /* ------------------------------------------------------------------------------------------------------- */
        /*  CONSTRUCTORS                                                                                           */
        /* ------------------------------------------------------------------------------------------------------- */
        function MsgGeneric(t) {
            // just small buffer initially
            this.m_array_nesting = -1;
            this.m_array_position = new Array(10);
            this.m_WritingBody = false;
            this.m_Data = null;
            this.m_Reply = null;
            this.m_ReplyCb = null;
            if (t != MsgType.Unknown) {
                this.m_Data = new Uint8Array(128);
                this.hdr_SetEndianness(Endianness.LittleEndian);
                this.hdr_SetMsgType(t);
                this.hdr_SetMajorVersion(0x00);
                this.hdr_SetBodyLength(0);
                this.hdr_SetHeaderLength(0);
                this.hdr_SetSerialNumber(g_NextSerialNumber++);
            }
            else {
                this.m_Data = null;
            }
        }
        MsgGeneric.prototype.FromBuffer = function (bytes) {
            if (bytes.length >= 16) {
                this.m_Data = bytes;
                var length = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
                if ((bytes.length >= length) && (length < 1024)) {
                    if (bytes.length > length) {
                        this.m_Data = new Uint8Array(length);
                        this.m_Data.set(bytes);
                    }
                    return length;
                }
            }
            this.m_Data = null;
            return 0;
        };
        MsgGeneric.prototype.CreateReply = function () {
            this.m_Reply = new MsgGeneric(MsgType.MethodReturn);
            this.m_Reply.hdr_SetDestination(this.hdr_GetSender());
            this.m_Reply.hdr_SetSender(this.hdr_GetDestination());
            this.m_Reply.hdr_SetReplySerial(this.hdr_GetSerialNumber());
        };
        /* ------------------------------------------------------------------------------------------------------- */
        /*  PUBLIC MESSAGE HEADERS INTERFACE                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.prototype.hdr_GetEndianness = function () {
            return (this.m_Data[0] == 0x6c) ? Endianness.LittleEndian : Endianness.BigEndian;
        };
        MsgGeneric.prototype.hdr_SetEndianness = function (value) {
            if (value == Endianness.LittleEndian)
                this.m_Data[0] = 0x6c;
            else
                this.m_Data[0] = 0x42;
        };
        MsgGeneric.prototype.hdr_GetMsgType = function () {
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
        };
        MsgGeneric.prototype.hdr_SetMsgType = function (value) {
            switch (value) {
                case MsgType.MethodCall:
                    this.m_Data[1] = 1;
                    break;
                case MsgType.MethodReturn:
                    this.m_Data[1] = 2;
                    break;
                case MsgType.Error:
                    this.m_Data[1] = 3;
                    break;
                case MsgType.Signal:
                    this.m_Data[1] = 4;
                    break;
                default:
                    this.m_Data[1] = 0;
                    break;
            }
        };
        MsgGeneric.prototype.hdr_GetNoReplyExpected = function () {
            return (0 != (this.m_Data[2] & 0x01));
        };
        MsgGeneric.prototype.hdr_SetNoReplyExpected = function (value) {
            if (value)
                this.SetFlag(0x01);
            else
                this.ClearFlag(0x01);
        };
        MsgGeneric.prototype.hdr_GetAutoStart = function () {
            return (0 != (this.m_Data[2] & 0x02));
        };
        MsgGeneric.prototype.hdr_SetAutoStart = function (value) {
            if (value)
                this.SetFlag(0x02);
            else
                this.ClearFlag(0x02);
        };
        MsgGeneric.prototype.hdr_GetAllowRemoteMsg = function () {
            return (0 != (this.m_Data[2] & 0x04));
        };
        MsgGeneric.prototype.hdr_SetAllowRemoteMsg = function (value) {
            if (value)
                this.SetFlag(0x04);
            else
                this.ClearFlag(0x04);
        };
        MsgGeneric.prototype.hdr_GetSessionless = function () {
            return (0 != (this.m_Data[2] & 0x10));
        };
        MsgGeneric.prototype.hdr_SetSessionless = function (value) {
            if (value)
                this.SetFlag(0x10);
            else
                this.ClearFlag(0x10);
        };
        MsgGeneric.prototype.hdr_GetGlobalBroadcast = function () {
            return (0 != (this.m_Data[2] & 0x20));
        };
        MsgGeneric.prototype.hdr_SetGlobalBroadcast = function (value) {
            if (value)
                this.SetFlag(0x20);
            else
                this.ClearFlag(0x20);
        };
        MsgGeneric.prototype.hdr_GetCompressed = function () {
            return (0 != (this.m_Data[2] & 0x40));
        };
        MsgGeneric.prototype.hdr_SetCompressed = function (value) {
            if (value)
                this.SetFlag(0x40);
            else
                this.ClearFlag(0x40);
        };
        MsgGeneric.prototype.hdr_GetEncrypted = function () {
            return (0 != (this.m_Data[2] & 0x80));
        };
        MsgGeneric.prototype.hdr_SetEncrypted = function (value) {
            if (value)
                this.SetFlag(0x80);
            else
                this.ClearFlag(0x80);
        };
        MsgGeneric.prototype.hdr_GetMajorVersion = function () {
            return this.m_Data[3];
        };
        MsgGeneric.prototype.hdr_SetMajorVersion = function (value) {
            this.m_Data[3] = value;
        };
        MsgGeneric.prototype.hdr_GetBodyLength = function () {
            return this.GetUintAt(4);
        };
        MsgGeneric.prototype.hdr_SetBodyLength = function (value) {
            this.SetUintAt(4, value);
        };
        MsgGeneric.prototype.hdr_GetSerialNumber = function () {
            return this.GetUintAt(8);
        };
        MsgGeneric.prototype.hdr_SetSerialNumber = function (value) {
            this.SetUintAt(8, value);
        };
        MsgGeneric.prototype.hdr_GetHeaderLength = function () {
            return this.GetUintAt(12);
        };
        MsgGeneric.prototype.hdr_SetHeaderLength = function (value) {
            this.SetUintAt(12, value);
        };
        MsgGeneric.prototype.hdr_GetObjectPath = function () {
            return this._ExtractFieldFromHeader(FieldType.Path);
        };
        MsgGeneric.prototype.hdr_SetObjectPath = function (value) {
            this.AddField(FieldType.Path, value);
        };
        MsgGeneric.prototype.hdr_GetInterface = function () {
            return this._ExtractFieldFromHeader(FieldType.Interface);
        };
        MsgGeneric.prototype.hdr_SetInterface = function (value) {
            this.AddField(FieldType.Interface, value);
        };
        MsgGeneric.prototype.hdr_GetMember = function () {
            return this._ExtractFieldFromHeader(FieldType.Member);
        };
        MsgGeneric.prototype.hdr_SetMember = function (value) {
            this.AddField(FieldType.Member, value);
        };
        MsgGeneric.prototype.hdr_GetDestination = function () {
            return this._ExtractFieldFromHeader(FieldType.Destination);
        };
        MsgGeneric.prototype.hdr_SetDestination = function (value) {
            this.AddField(FieldType.Destination, value);
        };
        MsgGeneric.prototype.hdr_GetSender = function () {
            return this._ExtractFieldFromHeader(FieldType.Sender);
        };
        MsgGeneric.prototype.hdr_SetSender = function (value) {
            this.AddField(FieldType.Sender, value);
        };
        MsgGeneric.prototype.hdr_GetReplySerial = function () {
            var o = this._ExtractFieldFromHeader(FieldType.ReplySerial);
            return (null != o) ? o : 0;
        };
        MsgGeneric.prototype.hdr_SetReplySerial = function (value) {
            this.AddField(FieldType.ReplySerial, value);
        };
        MsgGeneric.prototype.hdr_GetSignature = function () {
            return this._ExtractFieldFromHeader(FieldType.Signature);
        };
        MsgGeneric.prototype.hdr_SetSignature = function (value) {
            this.AddField(FieldType.Signature, value);
        };
        MsgGeneric.prototype.hdr_GetErrorName = function () {
            return this._ExtractFieldFromHeader(FieldType.ErrorName);
        };
        MsgGeneric.prototype.hdr_SetErrorName = function (value) {
            this.AddField(FieldType.ErrorName, value);
        };
        /* ------------------------------------------------------------------------------------------------------- */
        /*  WRITING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.prototype.body_StartWriting = function () {
            this.m_WritingBody = true;
            this.m_position = 16 + this.RoundedHeaderLength();
        };
        MsgGeneric.prototype.body_Write_Y = function (v) {
            this.EnsureBufferSize(1);
            this.SetByteAt(this.m_position++, v);
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_B = function (v) {
            this.body_Write_I(v ? 1 : 0);
        };
        MsgGeneric.prototype.body_Write_N = function (v) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);
            this.m_position += 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_Q = function (v) {
            this.Align(2);
            this.EnsureBufferSize(2);
            this.SetUint16At(this.m_position, v);
            this.m_position += 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_I = function (v) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);
            this.m_position += 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_U = function (v) {
            this.Align(4);
            this.EnsureBufferSize(4);
            this.SetUintAt(this.m_position, v);
            this.m_position += 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_S = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4 + 1);
            this.SetUintAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 4, v);
            this.m_position += 4 + v.length + 1;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_O = function (v) {
            this.body_Write_S(v);
        };
        MsgGeneric.prototype.body_Write_G = function (v) {
            this.EnsureBufferSize(1 + v.length + 1);
            this.SetByteAt(this.m_position, v.length);
            this.SetStringAt(this.m_position + 1, v);
            this.m_position += 1 + v.length + 1;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AY = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length + 4);
            this.SetUintAt(this.m_position, v.length);
            this.SetBytesAt(this.m_position + 4, v);
            this.m_position += 4 + v.length;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AN = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);
            this.body_Write_U(v.length * 2);
            for (var i = 0; i < v.length; i++) {
                // XXX - make sure it's converted correctly
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }
            this.m_position += v.length * 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AQ = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 2 + 4);
            this.body_Write_U(v.length * 2);
            for (var i = 0; i < v.length; i++) {
                this.SetUint16At(this.m_position + i * 2, v[i]);
            }
            this.m_position += v.length * 2;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AI = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);
            this.body_Write_U(v.length * 4);
            for (var i = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }
            this.m_position += v.length * 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_AU = function (v) {
            this.Align(4);
            this.EnsureBufferSize(v.length * 4 + 4);
            this.body_Write_U(v.length * 4);
            for (var i = 0; i < v.length; i++) {
                // XXX - make sure ints are converted properly
                this.SetUintAt(this.m_position + i * 4, v[i]);
            }
            this.m_position += v.length * 4;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_Write_R_Start = function () {
            this.Align(8);
        };
        MsgGeneric.prototype.body_Write_A_Start = function () {
            this.Align(4); // XXX - is this correct?
            // store beginning of the array position
            this.m_array_position[++this.m_array_nesting] = this.m_position;
            // and write array size, for now it's going to be 0
            this.body_Write_U(0);
        };
        MsgGeneric.prototype.body_Write_A_End = function (eight_byte_padding) {
            // XXX - take care about element alignment
            var temp_position = this.m_position;
            var padding_offset = 0;
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
        };
        MsgGeneric.prototype.body_Write_V = function (v, sig) {
            this.body_Write_G(sig);
            this.body_WriteObject(sig, v);
        };
        MsgGeneric.prototype.body_WriteRaw = function (data) {
            this.EnsureBufferSize(data.length);
            this.SetBytesAt(this.m_position, data);
            this.m_position += data.length;
            this.body_UpdateLength();
        };
        MsgGeneric.prototype.body_WriteObject = function (sig, v) {
            switch (sig) {
                case "s":
                case "o":
                    this.body_Write_S(v);
                    return;
                case "g":
                    this.body_Write_G(v);
                    return;
                case "b":
                    this.body_Write_B(v);
                    return;
                case "y":
                    this.body_Write_Y(v);
                    return;
                case "n":
                    this.body_Write_N(v);
                    return;
                case "q":
                    this.body_Write_Q(v);
                    return;
                case "i":
                    this.body_Write_I(v);
                    return;
                case "u":
                    this.body_Write_U(v);
                    return;
                case "ay":
                    this.body_Write_AY(v);
                    return;
                case "an":
                    this.body_Write_AN(v);
                    return;
                case "aq":
                    this.body_Write_AQ(v);
                    return;
                case "ai":
                    this.body_Write_AI(v);
                    return;
                case "au":
                    this.body_Write_AU(v);
                    return;
            }
            if (sig[0] == 'a') {
                this.body_Write_A_Start();
                if (sig[1] == '{') {
                    var d = v;
                    for (var _i = 0; _i < d.length; _i++) {
                        var k = d[_i];
                        this.body_WriteObject(this.GetSubSignature(sig, 1), k);
                    }
                }
                else {
                    var l = v;
                    for (var _a = 0; _a < l.length; _a++) {
                        var o = l[_a];
                        this.body_WriteObject(this.GetSubSignature(sig, 1), o);
                    }
                }
                this.body_Write_A_End((sig[1] == '{') || (sig[1] == '('));
            }
            else if (sig[0] == '{') {
                // XXX - keyvalue pair will be array with 2 elemenst for now
                var kv = v;
                this.Align(8);
                var ss = this.GetSubSignature(sig, 1);
                this.body_WriteObject(ss, kv[0]);
                ss = this.GetSubSignature(sig, 1 + ss.length);
                this.body_WriteObject(ss, kv[1]);
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var idx = 1;
                for (var _b = 0, _c = v; _b < _c.length; _b++) {
                    var o = _c[_b];
                    var ss = this.GetSubSignature(sig, idx);
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
        };
        MsgGeneric.prototype.body_UpdateLength = function () {
            if (this.m_WritingBody) {
                this.hdr_SetBodyLength(this.m_position - (16 + this.RoundedHeaderLength()));
            }
        };
        /*WRITER-CODE-HERE*/
        /* ------------------------------------------------------------------------------------------------------- */
        /*  READING MESSAGE BODY                                                                                   */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.prototype.body_StartReading = function () {
            this.m_position = 16 + this.RoundedHeaderLength();
        };
        MsgGeneric.prototype.body_Read_Y = function () {
            return this.GetByteAt(this.m_position++);
        };
        MsgGeneric.prototype.body_Read_B = function () {
            return (0 != this.body_Read_I());
        };
        MsgGeneric.prototype.body_Read_N = function () {
            this.Align(2);
            var ret = this.GetUint16At(this.m_position);
            if (ret > 0x7fff)
                ret -= 0x10000;
            this.m_position += 2;
            return ret;
        };
        MsgGeneric.prototype.body_Read_Q = function () {
            this.Align(2);
            var ret = this.GetUint16At(this.m_position);
            this.m_position += 2;
            return ret;
        };
        MsgGeneric.prototype.body_Read_I = function () {
            this.Align(4);
            var ret = this.GetUintAt(this.m_position);
            if (ret > 0x7fffffff)
                ret -= 0x100000000;
            this.m_position += 4;
            return ret;
        };
        MsgGeneric.prototype.body_Read_U = function () {
            this.Align(4);
            var ret = this.GetUintAt(this.m_position);
            this.m_position += 4;
            return ret;
        };
        MsgGeneric.prototype.body_Read_S = function () {
            var arr = this.body_Read_AY();
            // XXX - strings are null terminated, so increment position
            this.m_position++;
            return String.fromCharCode.apply(null, arr);
        };
        MsgGeneric.prototype.body_Read_G = function () {
            var length = this.body_Read_Y();
            if (this.m_position + length <= this.m_Data.length) {
                var buffer = new Int8Array(length);
                for (var i = 0; i < length; i++) {
                    buffer[i] = this.m_Data[this.m_position++];
                }
                // XXX - strings are null terminated, so increment position
                this.m_position++;
                return String.fromCharCode.apply(null, buffer);
            }
            return "";
        };
        MsgGeneric.prototype.body_ReadArrayLength = function () {
            return this.body_Read_I();
        };
        MsgGeneric.prototype.body_Read_AY = function () {
            var length = this.body_Read_I();
            var ret = null;
            if (this.m_position + length <= this.m_Data.length) {
                ret = new Uint8Array(length);
                for (var i = 0; i < length; i++) {
                    ret[i] = this.m_Data[this.m_position++];
                }
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AN = function () {
            var length = this.body_Read_I();
            var ret = new Int16Array(length / 2);
            for (var i = 0; i < length / 2; i++) {
                ret[i] = this.body_Read_N();
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AQ = function () {
            var length = this.body_Read_I();
            var ret = new Uint16Array(length / 2);
            for (var i = 0; i < length / 2; i++) {
                ret[i] = this.body_Read_Q();
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AI = function () {
            var length = this.body_Read_I();
            var ret = new Int32Array(length / 4);
            for (var i = 0; i < length / 4; i++) {
                ret[i] = this.body_Read_I();
            }
            return ret;
        };
        MsgGeneric.prototype.body_Read_AU = function () {
            var length = this.body_Read_I();
            var ret = new Uint32Array(length / 4);
            for (var i = 0; i < length / 4; i++) {
                ret[i] = this.body_Read_U();
            }
            return ret;
        };
        MsgGeneric.prototype.body_ReadObject = function (sig) {
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
                var size = this.body_ReadArrayLength();
                var end = this.m_position + size;
                var ss = this.GetSubSignature(sig, 1);
                if (ss[0] == '{') {
                    var ret = new Array();
                    while (this.m_position < end) {
                        var kv = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }
                else {
                    // XXX - now it's the same as in case of a{
                    var ret = new Array();
                    while (this.m_position < end) {
                        var kv = this.body_ReadObject(ss);
                        ret.push(kv);
                    }
                }
                return ret;
            }
            else if (sig[0] == '{') {
                this.Align(8);
                var subSignature = this.GetSubSignature(sig, 1);
                var k = this.body_ReadObject(subSignature);
                subSignature = this.GetSubSignature(sig, 1 + subSignature.length);
                var v = this.body_ReadObject(subSignature);
                var ret = new Array(2);
                ret[0] = k;
                ret[1] = v;
                return ret;
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var ret = new Array();
                var subSignature = "";
                var idx = 1;
                while (sig[idx + subSignature.length] != ')') {
                    idx += subSignature.length;
                    subSignature = this.GetSubSignature(sig, idx);
                    ret.push(this.body_ReadObject(subSignature));
                }
                return ret;
            }
            else if (sig == "v") {
                return this.body_Read_V();
            }
        };
        MsgGeneric.prototype.body_Read_V = function () {
            var sig = this.body_Read_G();
            return this.body_ReadObject(sig);
        };
        /*READER-CODE-HERE*/
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
        MsgGeneric.prototype.SetFlag = function (flag) {
            this.m_Data[2] |= flag;
        };
        MsgGeneric.prototype.ClearFlag = function (flag) {
            this.m_Data[2] &= ~flag;
        };
        MsgGeneric.prototype.SetFlags = function (f) {
            this.m_Data[2] = f;
        };
        MsgGeneric.prototype._ExtractFieldFromHeader = function (t) {
            var temp_position = this.m_position;
            var o = this._ExtractFieldFromHeaderX(t);
            this.m_position = temp_position;
            return o;
        };
        MsgGeneric.prototype._ExtractFieldFromHeaderX = function (t) {
            this.m_position = 16;
            while (this.m_position < 16 + this.RoundedHeaderLength()) {
                var field = this.body_Read_Y();
                var signature = this.body_Read_G();
                switch (field) {
                    case FieldType.Path:
                        if (signature != "o")
                            return null;
                        break;
                    case FieldType.Interface:
                    case FieldType.Member:
                    case FieldType.Destination:
                    case FieldType.Sender:
                    case FieldType.ErrorName:
                        if (signature != "s")
                            return null;
                        break;
                    case FieldType.Signature:
                        if (signature != "g")
                            return null;
                        break;
                    case FieldType.ReplySerial:
                        if (signature != "u")
                            return null;
                        break;
                    default:
                        return null;
                }
                var str = null;
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
        };
        MsgGeneric.prototype.AddField = function (t, v) {
            // can't add fields if body is already started (for simplicity)
            if (this.hdr_GetBodyLength() > 0)
                return;
            this.m_position = 16 + this.RoundedHeaderLength();
            this.EnsureBufferSize(128);
            switch (t) {
                case FieldType.Path:
                    this.m_Data[this.m_position] = 0x01;
                    break;
                case FieldType.Interface:
                    this.m_Data[this.m_position] = 0x02;
                    break;
                case FieldType.Member:
                    this.m_Data[this.m_position] = 0x03;
                    break;
                case FieldType.Destination:
                    this.m_Data[this.m_position] = 0x06;
                    break;
                case FieldType.Sender:
                    this.m_Data[this.m_position] = 0x07;
                    break;
                case FieldType.Signature:
                    this.m_Data[this.m_position] = 0x08;
                    break;
                case FieldType.ErrorName:
                    this.m_Data[this.m_position] = 0x04;
                    break;
                case FieldType.ReplySerial:
                    this.m_Data[this.m_position] = 0x05;
                    break;
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
        };
        MsgGeneric.prototype.SetByteAt = function (idx, b) {
            this.m_Data[idx] = b;
        };
        MsgGeneric.prototype.SetUintAt = function (idx, u) {
            this.m_Data[idx] = (u & 0xff);
            this.m_Data[idx + 1] = ((u >> 8) & 0xff);
            this.m_Data[idx + 2] = ((u >> 16) & 0xff);
            this.m_Data[idx + 3] = ((u >> 24) & 0xff);
        };
        MsgGeneric.prototype.SetUint16At = function (idx, u) {
            this.m_Data[idx] = (u & 0x0ff);
            this.m_Data[idx + 1] = ((u & 0x0ff00) >> 8);
        };
        MsgGeneric.prototype.SetStringAt = function (idx, s) {
            var length = s.length;
            for (var i = 0; i < length; i++) {
                this.m_Data[idx + i] = s.charCodeAt(i);
            }
            this.m_Data[idx + length] = 0;
        };
        MsgGeneric.prototype.SetBytesAt = function (idx, data) {
            this.m_Data.set(data, idx);
        };
        MsgGeneric.prototype.GetByteAt = function (idx) {
            if (idx + 1 <= this.m_Data.length) {
                return this.m_Data[idx];
            }
            else {
                return 0;
            }
        };
        MsgGeneric.prototype.GetUintAt = function (idx) {
            if (idx + 4 <= this.m_Data.length) {
                return this.m_Data[idx] +
                    (this.m_Data[idx + 1]) * 256 +
                    (this.m_Data[idx + 2]) * 256 * 256 +
                    (this.m_Data[idx + 3]) * 256 * 256 * 256;
            }
            else {
                return 0;
            }
        };
        MsgGeneric.prototype.GetUint16At = function (idx) {
            if (idx + 2 <= this.m_Data.length) {
                return this.m_Data[idx] + this.m_Data[idx + 1] * 256;
            }
            else {
                return 0;
            }
        };
        MsgGeneric.prototype.RoundedHeaderLength = function () {
            return Math.floor((this.hdr_GetHeaderLength() + 7) / 8) * 8;
        };
        MsgGeneric.prototype.GetBuffer = function () {
            var length = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
            return this.m_Data.subarray(0, length);
        };
        MsgGeneric.prototype.GetBodyBuffer = function () {
            var idx = 16 + this.RoundedHeaderLength();
            var length = this.hdr_GetBodyLength();
            return this.m_Data.subarray(idx, length);
        };
        MsgGeneric.prototype.Align = function (alignment) {
            this.m_position = Math.floor((this.m_position + alignment - 1) / alignment) * alignment;
        };
        MsgGeneric.prototype.EnsureBufferSize = function (size) {
            size += this.m_position;
            if (size <= this.m_Data.length)
                return;
            var nb = new Uint8Array(size);
            nb.set(this.m_Data);
            this.m_Data = nb;
        };
        /* ------------------------------------------------------------------------------------------------------- */
        /*  SIGNATURE HELPER                                                                                       */
        /* ------------------------------------------------------------------------------------------------------- */
        MsgGeneric.prototype.ValidateSignature = function (signature, single) {
            if ((null == signature) || (0 == signature.length))
                return false;
            var count = 0;
            var idx = 0;
            while (idx < signature.length) {
                var ss = this.GetSubSignature(signature, idx);
                if (null == ss)
                    return false;
                idx += ss.length;
                count++;
            }
            if (single && (count > 1))
                return false;
            return true;
        };
        MsgGeneric.prototype.GetSubSignature = function (signature, idx) {
            var end = this.GetSubSignatureEnd(signature, idx);
            if (end > 0) {
                return signature.substring(idx, end);
            }
            else {
                return null;
            }
        };
        MsgGeneric.prototype.GetSubSignatureEnd = function (signature, idx) {
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
                        idx = this.GetSubSignatureEnd(signature, idx);
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
                    return this.GetSubSignatureEnd(signature, idx + 1);
                case '{':
                    idx = this.GetSubSignatureEnd(signature, idx + 1);
                    if (idx > 0) {
                        idx = this.GetSubSignatureEnd(signature, idx);
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
        };
        return MsgGeneric;
    })();
    AJ.MsgGeneric = MsgGeneric;
    var ConnectorState;
    (function (ConnectorState) {
        ConnectorState[ConnectorState["StateDisconnected"] = 0] = "StateDisconnected";
        ConnectorState[ConnectorState["StateTransportConnecting"] = 1] = "StateTransportConnecting";
        ConnectorState[ConnectorState["StateAuthAnonumousSent"] = 2] = "StateAuthAnonumousSent";
        ConnectorState[ConnectorState["StateInformProtoVersionSent"] = 3] = "StateInformProtoVersionSent";
        ConnectorState[ConnectorState["StateBeginSent"] = 4] = "StateBeginSent";
        ConnectorState[ConnectorState["StateHelloSent"] = 5] = "StateHelloSent";
        ConnectorState[ConnectorState["StateConnected"] = 6] = "StateConnected";
    })(ConnectorState || (ConnectorState = {}));
    ;
    (function (ConnectorEventType) {
        ConnectorEventType[ConnectorEventType["ConnectorEventNone"] = 0] = "ConnectorEventNone";
        ConnectorEventType[ConnectorEventType["ConnectorEventConnected"] = 1] = "ConnectorEventConnected";
        ConnectorEventType[ConnectorEventType["ConnectorEventConnectionFailed"] = 2] = "ConnectorEventConnectionFailed";
        ConnectorEventType[ConnectorEventType["ConnectorEventProcessRequested"] = 3] = "ConnectorEventProcessRequested";
        ConnectorEventType[ConnectorEventType["ConnectorEventTextReceived"] = 4] = "ConnectorEventTextReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventTextSent"] = 5] = "ConnectorEventTextSent";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReceived"] = 6] = "ConnectorEventMsgReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgSent"] = 7] = "ConnectorEventMsgSent";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReplyReceived"] = 8] = "ConnectorEventMsgReplyReceived";
        ConnectorEventType[ConnectorEventType["ConnectorEventMsgReplySent"] = 9] = "ConnectorEventMsgReplySent";
    })(AJ.ConnectorEventType || (AJ.ConnectorEventType = {}));
    var ConnectorEventType = AJ.ConnectorEventType;
    ;
    var ConnectorBase = (function () {
        function ConnectorBase() {
            this.m_Buffer = null;
            this.m_LocalNodeId = "";
            this.m_AssignedBusName = "";
            this.m_PeerNodeId = "";
            this.m_EventHandler = null;
            this.m_CalledMethods = new Array();
        }
        ConnectorBase.prototype.ConnectAndAuthenticate = function () {
            this.m_State = ConnectorState.StateTransportConnecting;
            this.ConnectTransport();
        };
        ConnectorBase.prototype.GetLocalNodeId = function () {
            return this.m_LocalNodeId;
        };
        ConnectorBase.prototype.OnTransportConnected = function (ok) {
            if (ok) {
                this.m_State = ConnectorState.StateAuthAnonumousSent;
                this.SendLine("\0");
                this.SendLine("AUTH ANONYMOUS\r\n");
                this.ReadData();
            }
            else {
                this.m_State = ConnectorState.StateDisconnected;
                this.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnectionFailed, null);
            }
        };
        ConnectorBase.prototype.OnDataReceived = function (data) {
            if (null != this.m_Buffer) {
                var a = new Uint8Array(this.m_Buffer.length + data.length);
                var offset = this.m_Buffer.length;
                for (var i = 0; i < offset; i++)
                    a[i] = this.m_Buffer[i];
                for (var i = 0; i < data.length; i++)
                    a[i + offset] = data[i];
                this.m_Buffer = a;
            }
            else {
                this.m_Buffer = data;
            }
            this.Process();
        };
        ConnectorBase.prototype.Process = function () {
            // first distribute all outstanding event notifications
            //List < ConnectorEvent > l = m_QueuedEvents;
            //m_QueuedEvents = new List<ConnectorEvent>();
            //foreach(ConnectorEvent e in l)
            // {
            //    NotifyConnectorEvent(e.type, e.data);
            //}
            if (null == this.m_Buffer)
                return;
            if (ConnectorState.StateAuthAnonumousSent == this.m_State) {
                var line = this.ReceiveLine();
                if (line.substr(0, 3) == "OK ") {
                    this.SendLine("INFORM_PROTO_VERSION 12\r\n");
                    this.m_State = ConnectorState.StateInformProtoVersionSent;
                }
            }
            else if (ConnectorState.StateInformProtoVersionSent == this.m_State) {
                var line = this.ReceiveLine();
                if (line.substr(0, 21) == "INFORM_PROTO_VERSION ") {
                    this.SendLine("BEGIN 0d720fe995bc54ff15c00e9af0b20140\r\n");
                    this.m_Buffer = null;
                    this.m_State = ConnectorState.StateHelloSent;
                    this.SendHello();
                }
            }
            else {
                while (this.m_Buffer != null) {
                    // try to decode next message
                    var msg = new AJ.MsgGeneric(AJ.MsgType.Unknown);
                    var length = msg.FromBuffer(this.m_Buffer);
                    if (0 == length)
                        break;
                    this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgReceived, msg);
                    var t = msg.hdr_GetMsgType();
                    if ((MsgType.Signal == t) || (MsgType.MethodCall == t)) {
                        var iface = msg.hdr_GetInterface();
                        if (iface == "org.freedesktop.DBus.Peer")
                            _org_freedesktop_dbus_peer__ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Introspectable")
                            _org_freedesktop_dbus_introspectable__ProcessMsg(this, msg);
                        else if (iface == "org.allseen.Introspectable")
                            _org_allseen_introspectable__ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.About")
                            _org_alljoyn_about__ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Icon")
                            _org_alljoyn_icon__ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus")
                            _org_freedesktop_dbus__ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus")
                            _org_alljoyn_bus__ProcessMsg(this, msg);
                        else if (iface == "org.freedesktop.DBus.Properties")
                            _org_freedesktop_dbus_properties__ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Daemon")
                            _org_alljoyn_daemon_ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Session")
                            _org_alljoyn_bus_peer_session_ProcessMsg(this, msg);
                        else if (iface == "org.alljoyn.Bus.Peer.Authentication")
                            _org_alljoyn_bus_peer_authentication_ProcessMsg(this, msg);
                        else
                            _ProcessMsg(this, msg);
                        if (msg.m_Reply != null)
                            this.SendMsg(msg.m_Reply);
                    }
                    else if (t == MsgType.MethodReturn) {
                        var i = 0;
                        var sent = null;
                        if (this.m_AssignedBusName == "") {
                            this.m_AssignedBusName = msg.hdr_GetSender();
                        }
                        while (i < this.m_CalledMethods.length) {
                            sent = this.m_CalledMethods[i];
                            if (sent.hdr_GetSerialNumber() == msg.hdr_GetReplySerial()) {
                                this.m_CalledMethods[i] = this.m_CalledMethods[this.m_CalledMethods.length - 1];
                                this.m_CalledMethods.pop();
                                break;
                            }
                        }
                        if ((null != sent) && (null != sent.m_ReplyCb)) {
                            sent.m_Reply = msg;
                            sent.m_ReplyCb();
                        }
                    }
                    else if (t == MsgType.Error) {
                        console.log("XXX - ERROR " + msg.hdr_GetErrorName());
                    }
                    // update buffer
                    if (length < this.m_Buffer.length) {
                        var old_buffer = this.m_Buffer;
                        this.m_Buffer = new Uint8Array(old_buffer.length - length);
                        for (var i = 0; i < old_buffer.length - length; i++)
                            this.m_Buffer[i] = old_buffer[length + i];
                    }
                    else {
                        this.m_Buffer = null;
                    }
                }
            }
        };
        ConnectorBase.prototype.SendHello = function () {
            var __this__ = this;
            method__org_freedesktop_DBus__Hello(this, function (connection, bus) {
                __this__.m_LocalNodeId = bus;
                __this__.QueueConnectorEvent(ConnectorEventType.ConnectorEventConnected, null);
                __this__.m_State = ConnectorState.StateConnected;
                if (APP_NAME != "") {
                    __this__.BindSessionPort();
                }
                else {
                    __this__.AttachSession();
                }
            });
        };
        ConnectorBase.prototype.BindSessionPort = function () {
            var __this__ = this;
            method__org_alljoyn_Bus__BindSessionPort(this, 2, 0, function (connection, disposition, portOut) {
                signal__org_alljoyn_About__Announce(connection, 1, 2, null, null);
            });
        };
        ConnectorBase.prototype.AttachSession = function () {
        };
        ConnectorBase.prototype.SendLine = function (buffer) {
            var a = new Uint8Array(buffer.length);
            for (var i = 0; i < buffer.length; i++)
                a[i] = buffer.charCodeAt(i);
            this.WriteData(a);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextSent, buffer);
        };
        ConnectorBase.prototype.ReceiveLine = function () {
            // XXX - this is not quite correct
            var line = String.fromCharCode.apply(null, this.m_Buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventTextReceived, line);
            // XXX - this is not correct either
            this.m_Buffer = null;
            return line;
        };
        ConnectorBase.prototype.SendMsg = function (msg) {
            var buffer = msg.GetBuffer();
            this.WriteData(buffer);
            this.QueueConnectorEvent(ConnectorEventType.ConnectorEventMsgSent, msg);
        };
        ConnectorBase.prototype.SendMsgWithCallback = function (msg, cb) {
            msg.m_ReplyCb = cb;
            this.m_CalledMethods.push(msg);
            this.SendMsg(msg);
        };
        ConnectorBase.prototype.SetConnectorEvent = function (e) {
            this.m_EventHandler = e;
        };
        ConnectorBase.prototype.QueueConnectorEvent = function (e, d) {
            // XXX - no queue for timebeing
            this.NotifyConnectorEvent(e, d);
        };
        ConnectorBase.prototype.NotifyConnectorEvent = function (e, d) {
            if (null != this.m_EventHandler) {
                this.m_EventHandler(e, d);
            }
        };
        return ConnectorBase;
    })();
    AJ.ConnectorBase = ConnectorBase;
    ;
    //==============================================================================================================
    // org.alljoyn.About - producer
    //==============================================================================================================
    function _org_alljoyn_about__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "GetAboutData") {
            return __process__org_alljoyn_About__GetAboutData(connection, msg);
        }
        else if (member == "GetObjectDescription") {
            return __process__org_alljoyn_About__GetObjectDescription(connection, msg);
        }
        else if (member == "Announce") {
            return __process__org_alljoyn_About__Announce(connection, msg);
        }
        return false;
    }
    function __process__org_alljoyn_About__GetAboutData(connection, msg) {
        msg.body_StartReading();
        var s1 = msg.body_Read_S();
        var ret = handle__org_alljoyn_About__GetAboutData(connection, s1);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("a{sv}");
        msg.m_Reply.body_StartWriting();
        //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
        return true;
    }
    function __process__org_alljoyn_About__GetObjectDescription(connection, msg) {
        msg.body_StartReading();
        var ret = handle__org_alljoyn_About__GetObjectDescription(connection);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("a(oas)");
        msg.m_Reply.body_StartWriting();
        //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
        return true;
    }
    function __process__org_alljoyn_About__Announce(connection, msg) {
        msg.body_StartReading();
        var q1 = msg.body_Read_Q();
        var q2 = msg.body_Read_Q();
        var o1 = msg.body_ReadObject("a(oas)");
        var o2 = msg.body_ReadObject("a{sv}");
        handle__org_alljoyn_About__Announce(connection, q1, q2, o1, o2);
        return true;
    }
    function signal__org_alljoyn_About__Announce(connection, q1, q2, o1, o2) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetSessionless(true);
        msg.hdr_SetObjectPath("/About");
        msg.hdr_SetInterface("org.alljoyn.About");
        msg.hdr_SetMember("Announce");
        msg.hdr_SetSignature("qqa(oas)a{sv}");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_Q(q1);
        msg.body_Write_Q(q2);
        // at this time we will write array elements manually
        //msg.body_WriteObject("a(oas)", [
        msg.body_Write_AROAS([
            ["/About", ["org.alljoyn.About"]],
            ["/About/DeviceIcon", ["org.alljoyn.Icon"]],
            ["/TestInterface", ["org.allmake.TestInterface"]]]);
        //msg.body_WriteArrayStart();
        //msg.body_WriteStructStart();
        //msg.body_WriteString("/About");
        //msg.body_WriteStringArray(new Array<string>("org.alljoyn.About"));
        //msg.body_WriteStructStart();
        //msg.body_WriteString("/About/DeviceIcon");
        //msg.body_WriteStringArray(new Array<string>("org.alljoyn.Icon"));
        //msg.body_WriteStructStart();
        //msg.body_WriteString("/TestInterface");
        //msg.body_WriteStringArray(new Array<string>("org.allmake.TestInterface"));
        //msg.body_WriteArray_End(true);
        // at this time we will write array elements manually
        //msg.body_WriteObject(o2, "a{sv}");
        msg.body_Write_A_Start();
        msg.body_Write_R_Start();
        msg.body_Write_S("AppId");
        msg.body_Write_V(APP_ID, "ay");
        msg.body_Write_R_Start();
        msg.body_Write_S("AppName");
        msg.body_Write_V(APP_NAME, "s");
        msg.body_Write_R_Start();
        msg.body_Write_S("DeviceId");
        msg.body_Write_V(DEVICE_ID, "s");
        msg.body_Write_R_Start();
        msg.body_Write_S("DeviceName");
        msg.body_Write_V(DEVICE_NAME, "s");
        msg.body_Write_R_Start();
        msg.body_Write_S("Manufacturer");
        msg.body_Write_V(MANUFACTURER, "s");
        msg.body_Write_R_Start();
        msg.body_Write_S("ModelNumber");
        msg.body_Write_V(MODEL_NUMBER, "s");
        msg.body_Write_R_Start();
        msg.body_Write_S("SupportedLanguages");
        msg.body_Write_V(new Array("en"), "as");
        msg.body_Write_R_Start();
        msg.body_Write_S("Description");
        msg.body_Write_V(APP_DESCRIPTION, "s");
        msg.body_Write_R_Start();
        msg.body_Write_S("DefaultLanguage");
        msg.body_Write_V("en", "s");
        msg.body_Write_A_End(true);
        connection.SendMsg(msg);
    }
    function handle__org_alljoyn_About__GetAboutData(connection, s1) {
        return 0;
    }
    function handle__org_alljoyn_About__GetObjectDescription(connection) {
        return 0;
    }
    function handle__org_alljoyn_About__Announce(connection, q1, q2, o1, o2) {
    }
    //==============================================================================================================
    // org.alljoyn.Icon - producer
    //==============================================================================================================
    function _org_alljoyn_icon__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "GetUrl") {
            return __process__org_alljoyn_Icon__GetUrl(connection, msg);
        }
        else if (member == "GetContent") {
            return __process__org_alljoyn_Icon__GetContent(connection, msg);
        }
        return false;
    }
    function __process__org_alljoyn_Icon__GetUrl(connection, msg) {
        msg.body_StartReading();
        var ret = handle__org_alljoyn_Icon__GetUrl(connection);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("s");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_S(ret);
        return true;
    }
    function __process__org_alljoyn_Icon__GetContent(connection, msg) {
        msg.body_StartReading();
        var ret = handle__org_alljoyn_Icon__GetContent(connection);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("ay");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_AY(ret);
        return true;
    }
    function handle__org_alljoyn_Icon__GetUrl(connection) {
        return "";
    }
    function handle__org_alljoyn_Icon__GetContent(connection) {
        return DEVICE_ICON;
    }
    //==============================================================================================================
    // org.freedesktop.DBus.Properties - producer
    //==============================================================================================================
    function _org_freedesktop_dbus_properties__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "Get") {
            return __process__org_freedesktop_DBus_Properties__Get(connection, msg);
        }
        else if (member == "Set") {
            return __process__org_freedesktop_DBus_Properties__Set(connection, msg);
        }
        else if (member == "GetAll") {
            return __process__org_freedesktop_DBus_Properties__GetAll(connection, msg);
        }
        return false;
    }
    function __process__org_freedesktop_DBus_Properties__Get(connection, msg) {
        msg.body_StartReading();
        var s1 = msg.body_Read_S();
        var s2 = msg.body_Read_S();
        var ret = handle__org_freedesktop_DBus_Properties__Get(connection, s1, s2);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("v");
        msg.m_Reply.body_StartWriting();
        if (typeof (ret) == "string") {
            msg.m_Reply.body_Write_V(ret, "s");
        }
        else if (typeof (ret) == "number") {
            // XXX - why q??
            msg.m_Reply.body_Write_V(ret, "q");
        }
        return true;
    }
    function __process__org_freedesktop_DBus_Properties__Set(connection, msg) {
        msg.body_StartReading();
        var s1 = msg.body_Read_S();
        var s2 = msg.body_Read_S();
        var v1 = null; //msg.body_ReadVariant(); // XXX - fix this
        handle__org_freedesktop_DBus_Properties__Set(connection, s1, s2, v1);
        msg.CreateReply();
        msg.m_Reply.body_StartWriting();
        return true;
    }
    function __process__org_freedesktop_DBus_Properties__GetAll(connection, msg) {
        msg.body_StartReading();
        var s1 = msg.body_Read_S();
        var ret = handle__org_freedesktop_DBus_Properties__GetAll(connection, s1);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("a{sv}");
        msg.m_Reply.body_StartWriting();
        //msg.m_Reply.body_WriteObject(ret); // XXX - fix this
        return true;
    }
    function handle__org_freedesktop_DBus_Properties__Get(connection, s1, s2) {
        if (s1 == "org.alljoyn.Icon") {
            if (s2 == "Version") {
                return DEVICE_ICON_VERSION;
            }
            else if (s2 == "MimeType") {
                return DEVICE_ICON_MIME_TYPE;
            }
        }
        return 0;
    }
    function handle__org_freedesktop_DBus_Properties__Set(connection, s1, s2, v1) {
    }
    function handle__org_freedesktop_DBus_Properties__GetAll(connection, s1) {
        return 0;
    }
    //==============================================================================================================
    // org.freedesktop.DBus.Introspectable - producer
    //==============================================================================================================
    function _org_freedesktop_dbus_introspectable__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "Introspect") {
            return __process__org_freedesktop_DBus_Introspectable__Introspect(connection, msg);
        }
        return false;
    }
    function __process__org_freedesktop_DBus_Introspectable__Introspect(connection, msg) {
        msg.body_StartReading();
        var ret = handle__org_freedesktop_DBus_Introspectable__Introspect(connection, msg.hdr_GetObjectPath());
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("s");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_S(ret);
        return true;
    }
    function handle__org_freedesktop_DBus_Introspectable__Introspect(connection, op) {
        var ret = "";
        if (op == "/About") {
            ret =
                "<node name=\"/About\">" +
                    "<interface name=\"org.freedesktop.DBus.Properties\" >" +
                    "<method name=\"Get\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"Set\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"in\" />" +
                    "</method>" +
                    "<method name= \"GetAll\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "<interface name= \"org.alljoyn.About\" >" +
                    "<property name=\"Version\" type= \"q\" access= \"read\" />" +
                    "<method name=\"GetAboutData\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"GetObjectDescription\" >" +
                    "<arg type=\"a(oas)\" direction= \"out\" />" +
                    "</method>" +
                    "<signal name= \"Announce\" >" +
                    "<arg type=\"q\" />" +
                    "<arg type=\"q\" />" +
                    "<arg type=\"a(oas)\" />" +
                    "<arg type=\"a{sv}\" />" +
                    "</signal>" +
                    "</interface>" +
                    "</node>";
        }
        else if (op == "/About/DeviceIcon") {
            ret =
                "<node name=\"/About/DeviceIcon\" >" +
                    "<interface name=\"org.freedesktop.DBus.Properties\" >" +
                    "<method name=\"Get\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"Set\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"v\" direction= \"in\" />" +
                    "</method>" +
                    "<method name= \"GetAll\" >" +
                    "<arg type=\"s\" direction= \"in\" />" +
                    "<arg type=\"a{sv}\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "<interface name= \"org.alljoyn.Icon\" >" +
                    "<property name=\"Version\" type= \"q\" access= \"read\" />" +
                    "<property name=\"MimeType\" type= \"s\" access= \"read\" />" +
                    "<property name=\"Size\" type= \"u\" access= \"read\" />" +
                    "<method name=\"GetUrl\" >" +
                    "<arg type=\"s\" direction= \"out\" />" +
                    "</method>" +
                    "<method name= \"GetContent\" >" +
                    "<arg type=\"ay\" direction= \"out\" />" +
                    "</method>" +
                    "</interface>" +
                    "</node>";
        }
        else {
            ret = AJ.APP_INTROSPECTION_XML;
        }
        return ret;
    }
    //==============================================================================================================
    // org.allseen.Introspectable - producer
    //==============================================================================================================
    function _org_allseen_introspectable__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "GetDescriptionLanguages") {
            return __process__org_allseen_Introspectable__GetDescriptionLanguages(connection, msg);
        }
        else if (member == "IntrospectWithDescription") {
            return __process__org_allseen_Introspectable__IntrospectWithDescription(connection, msg);
        }
        return false;
    }
    function __process__org_allseen_Introspectable__GetDescriptionLanguages(connection, msg) {
        msg.body_StartReading();
        var ret = handle__org_allseen_Introspectable__GetDescriptionLanguages(connection);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("as");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_AS(ret);
        return true;
    }
    function __process__org_allseen_Introspectable__IntrospectWithDescription(connection, msg) {
        msg.body_StartReading();
        var languageTag = msg.body_ReadString();
        var ret = handle__org_allseen_Introspectable__IntrospectWithDescription(connection, msg.hdr_GetObjectPath(), languageTag);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("s");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_S(ret);
        return true;
    }
    function handle__org_allseen_Introspectable__GetDescriptionLanguages(connection) {
        return ["en"];
    }
    function handle__org_allseen_Introspectable__IntrospectWithDescription(connection, op, languageTag) {
        // ignore language tag
        return handle__org_freedesktop_DBus_Introspectable__Introspect(connection, op);
    }
    //==============================================================================================================
    // org.freedesktop.DBus.Peer - producer
    //==============================================================================================================
    function _org_freedesktop_dbus_peer__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "Ping") {
            return __process__org_freedesktop_DBus_Peer__Ping(connection, msg);
        }
        else if (member == "GetMachineId") {
            return __process__org_freedesktop_DBus_Peer__GetMachineId(connection, msg);
        }
        return false;
    }
    function __process__org_freedesktop_DBus_Peer__Ping(connection, msg) {
        msg.body_StartReading();
        handle__org_freedesktop_DBus_Peer__Ping(connection);
        msg.CreateReply();
        msg.m_Reply.body_StartWriting();
        return true;
    }
    function __process__org_freedesktop_DBus_Peer__GetMachineId(connection, msg) {
        msg.body_StartReading();
        var ret = handle__org_freedesktop_DBus_Peer__GetMachineId(connection);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("s");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_S(ret);
        return true;
    }
    function handle__org_freedesktop_DBus_Peer__Ping(connection) {
    }
    function handle__org_freedesktop_DBus_Peer__GetMachineId(connection) {
        return "default-string";
    }
    //==============================================================================================================
    // org.freedesktop.DBus - consumer
    //==============================================================================================================
    function _org_freedesktop_dbus__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "NameOwnerChanged") {
            return __process__org_freedesktop_DBus__NameOwnerChanged(connection, msg);
        }
        if (member == "NameLost") {
            return __process__org_freedesktop_DBus__NameLost(connection, msg);
        }
        if (member == "NameAcquired") {
            return __process__org_freedesktop_DBus__NameAcquired(connection, msg);
        }
        return false;
    }
    function __process__org_freedesktop_DBus__NameOwnerChanged(connection, msg) {
        msg.body_StartReading();
        var s1 = msg.body_Read_S();
        var s2 = msg.body_Read_S();
        var s3 = msg.body_Read_S();
        handle__org_freedesktop_DBus__NameOwnerChanged(connection, s1, s2, s3);
        return true;
    }
    function __process__org_freedesktop_DBus__NameLost(connection, msg) {
        msg.body_StartReading();
        var s1 = msg.body_Read_S();
        handle__org_freedesktop_DBus__NameLost(connection, s1);
        return true;
    }
    function __process__org_freedesktop_DBus__NameAcquired(connection, msg) {
        msg.body_StartReading();
        var s1 = msg.body_Read_S();
        handle__org_freedesktop_DBus__NameAcquired(connection, s1);
        return true;
    }
    function method__org_freedesktop_DBus__RequestName(connection, s1, u1, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("RequestName");
        msg.hdr_SetSignature("su");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        msg.body_Write_U(u1);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var u2 = msg.body_Read_U();
            if (null != cb)
                cb(connection, u2);
        });
    }
    ;
    function method__org_freedesktop_DBus__ReleaseName(connection, s1, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("ReleaseName");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var u1 = msg.body_Read_U();
            if (null != cb)
                cb(connection, u1);
        });
    }
    ;
    function method__org_freedesktop_DBus__Hello(connection, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("Hello");
        msg.SetFlags(6);
        msg.body_StartWriting();
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var s1 = msg.body_Read_S();
            if (null != cb)
                cb(connection, s1);
        });
    }
    ;
    function method__org_freedesktop_DBus__NameHasOwner(connection, s1, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("NameHasOwner");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var b1 = msg.body_Read_B();
            if (null != cb)
                cb(connection, b1);
        });
    }
    ;
    function method__org_freedesktop_DBus__AddMatch(connection, s1, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("AddMatch");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            if (null != cb)
                cb(connection);
        });
    }
    ;
    function method__org_freedesktop_DBus__RemoveMatch(connection, s1, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("RemoveMatch");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            if (null != cb)
                cb(connection);
        });
    }
    ;
    function signal__org_freedesktop_DBus__NameOwnerChanged(connection, s1, s2, s3) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("NameOwnerChanged");
        msg.hdr_SetSignature("sss");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        msg.body_Write_S(s2);
        msg.body_Write_S(s3);
        connection.SendMsg(msg);
    }
    ;
    function signal__org_freedesktop_DBus__NameLost(connection, s1) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("NameLost");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        connection.SendMsg(msg);
    }
    ;
    function signal__org_freedesktop_DBus__NameAcquired(connection, s1) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.freedesktop.DBus");
        msg.hdr_SetObjectPath("/org/freedesktop/DBus");
        msg.hdr_SetDestination("org.freedesktop.DBus");
        msg.hdr_SetMember("NameAcquired");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(s1);
        connection.SendMsg(msg);
    }
    ;
    function handle__org_freedesktop_DBus__NameOwnerChanged(connection, s1, s2, s3) {
    }
    ;
    function handle__org_freedesktop_DBus__NameLost(connection, s1) {
    }
    ;
    function handle__org_freedesktop_DBus__NameAcquired(connection, s1) {
    }
    ;
    //==============================================================================================================
    // org.alljoyn.Bus - consumer
    //==============================================================================================================
    function _org_alljoyn_bus__ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "FoundAdvertisedName") {
            return __process__org_alljoyn_Bus__FoundAdvertisedName(connection, msg);
        }
        else if (member == "LostAdvertisedName") {
            return __process__org_alljoyn_Bus__LostAdvertisedName(connection, msg);
        }
        else if (member == "MPSessionChanged") {
            return __process__org_alljoyn_Bus__MPSessionChanged(connection, msg);
        }
        else if (member == "MPSessionChangedWithReason") {
            return __process__org_alljoyn_Bus__MPSessionChangedWithReason(connection, msg);
        }
        else if (member == "SessionLost") {
            return __process__org_alljoyn_Bus__SessionLost(connection, msg);
        }
        else if (member == "SessionLostWithReason") {
            return __process__org_alljoyn_Bus__SessionLostWithReason(connection, msg);
        }
        else if (member == "SessionLostWithReasonAndDisposition") {
            return __process__org_alljoyn_Bus__SessionLostWithReasonAndDisposition(connection, msg);
        }
        return false;
    }
    function __process__org_alljoyn_Bus__FoundAdvertisedName(connection, msg) {
        msg.body_StartReading();
        var name = msg.body_Read_S();
        var transport = msg.body_Read_Q();
        var prefix = msg.body_Read_S();
        handle__org_alljoyn_Bus__FoundAdvertisedName(connection, name, transport, prefix);
        return true;
    }
    function __process__org_alljoyn_Bus__LostAdvertisedName(connection, msg) {
        msg.body_StartReading();
        var name = msg.body_Read_S();
        var transport = msg.body_Read_Q();
        var prefix = msg.body_Read_S();
        handle__org_alljoyn_Bus__LostAdvertisedName(connection, name, transport, prefix);
        return true;
    }
    function __process__org_alljoyn_Bus__MPSessionChanged(connection, msg) {
        msg.body_StartReading();
        var sessionId = msg.body_Read_U();
        var name = msg.body_Read_S();
        var isAdded = msg.body_Read_B();
        handle__org_alljoyn_Bus__MPSessionChanged(connection, sessionId, name, isAdded);
        return true;
    }
    function __process__org_alljoyn_Bus__MPSessionChangedWithReason(connection, msg) {
        msg.body_StartReading();
        var sessionId = msg.body_Read_U();
        var name = msg.body_Read_S();
        var isAdded = msg.body_Read_B();
        var reason = msg.body_Read_U();
        handle__org_alljoyn_Bus__MPSessionChangedWithReason(connection, sessionId, name, isAdded, reason);
        return true;
    }
    function __process__org_alljoyn_Bus__SessionLost(connection, msg) {
        msg.body_StartReading();
        var sessionId = msg.body_Read_U();
        handle__org_alljoyn_Bus__SessionLost(connection, sessionId);
        return true;
    }
    function __process__org_alljoyn_Bus__SessionLostWithReason(connection, msg) {
        msg.body_StartReading();
        var sessionId = msg.body_Read_U();
        var reason = msg.body_Read_U();
        handle__org_alljoyn_Bus__SessionLostWithReason(connection, sessionId, reason);
        return true;
    }
    function __process__org_alljoyn_Bus__SessionLostWithReasonAndDisposition(connection, msg) {
        msg.body_StartReading();
        var sessionId = msg.body_Read_U();
        var reason = msg.body_Read_U();
        var disposition = msg.body_Read_U();
        handle__org_alljoyn_Bus__SessionLostWithReasonAndDisposition(connection, sessionId, reason, disposition);
        return true;
    }
    function method__org_alljoyn_Bus__AdvertiseName(connection, name, transports, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("AdvertiseName");
        msg.hdr_SetSignature("sq");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        msg.body_Write_Q(transports);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__AliasUnixUser(connection, aliasUID, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("AliasUnixUser");
        msg.hdr_SetSignature("u");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(aliasUID);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__BindSessionPort(connection, portIn, opts, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("BindSessionPort");
        msg.hdr_SetSignature("qa{sv}");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_Q(portIn);
        // XXX - just fixed options at the moment
        //msg.body_WriteObject(opts, "a{sv}");
        var ooo = new Uint8Array([0x04, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x66, 0x00, 0x01, 0x79, 0x00, 0x01, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x6D, 0x75, 0x6C, 0x74, 0x69, 0x00, 0x01, 0x62, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x70, 0x72, 0x6F, 0x78, 0x00, 0x01, 0x79, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x74, 0x72, 0x61, 0x6E, 0x73, 0x00, 0x01, 0x71, 0x00, 0x00, 0x05, 0x01]);
        msg.body_Write_I(0x48);
        msg.body_WriteRaw(ooo);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            var portOut = msg.body_Read_Q();
            if (null != cb)
                cb(connection, disposition, portOut);
        });
    }
    ;
    function method__org_alljoyn_Bus__BusHello(connection, GUIDC, protoVerC, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("BusHello");
        msg.hdr_SetSignature("su");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(GUIDC);
        msg.body_Write_U(protoVerC);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var GUIDS = msg.body_Read_S();
            var uniqueName = msg.body_Read_S();
            var protoVerS = msg.body_Read_U();
            if (null != cb)
                cb(connection, GUIDS, uniqueName, protoVerS);
        });
    }
    ;
    function method__org_alljoyn_Bus__CancelAdvertiseName(connection, name, transports, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("CancelAdvertiseName");
        msg.hdr_SetSignature("sq");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        msg.body_Write_Q(transports);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__CancelFindAdvertisedName(connection, name, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("CancelFindAdvertisedName");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__CancelFindAdvertisedNameByTransport(connection, name, transports, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("CancelFindAdvertisedNameByTransport");
        msg.hdr_SetSignature("sq");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        msg.body_Write_Q(transports);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__CancelFindAdvertisementByTransport(connection, matching, transports, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("CancelFindAdvertisementByTransport");
        msg.hdr_SetSignature("sq");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(matching);
        msg.body_Write_Q(transports);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__CancelSessionlessMessage(connection, serialNum, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("CancelSessionlessMessage");
        msg.hdr_SetSignature("u");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(serialNum);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__FindAdvertisedName(connection, name, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("FindAdvertisedName");
        msg.hdr_SetSignature("s");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__FindAdvertisedNameByTransport(connection, name, transports, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("FindAdvertisedNameByTransport");
        msg.hdr_SetSignature("sq");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        msg.body_Write_Q(transports);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__FindAdvertisementByTransport(connection, matching, transports, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("FindAdvertisementByTransport");
        msg.hdr_SetSignature("sq");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(matching);
        msg.body_Write_Q(transports);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function signal__org_alljoyn_Bus__FoundAdvertisedName(connection, name, transport, prefix) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("FoundAdvertisedName");
        msg.hdr_SetSignature("sqs");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        msg.body_Write_Q(transport);
        msg.body_Write_S(prefix);
        connection.SendMsg(msg);
    }
    ;
    function method__org_alljoyn_Bus__GetHostInfo(connection, sessionId, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("GetHostInfo");
        msg.hdr_SetSignature("u");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            var localipaddr = msg.body_Read_S();
            var remoteipaddr = msg.body_Read_S();
            if (null != cb)
                cb(connection, disposition, localipaddr, remoteipaddr);
        });
    }
    ;
    function method__org_alljoyn_Bus__JoinSession(connection, sessionHost, port, opts, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("JoinSession");
        msg.hdr_SetSignature("sqa{sv}");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(sessionHost);
        msg.body_Write_Q(port);
        msg.body_WriteObject("a{sv}", opts);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disp = msg.body_Read_U();
            var sessionId = msg.body_Read_U();
            var opts = msg.body_ReadObject("a{sv}");
            if (null != cb)
                cb(connection, disp, sessionId, opts);
        });
    }
    ;
    function method__org_alljoyn_Bus__LeaveHostedSession(connection, sessionId, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("LeaveHostedSession");
        msg.hdr_SetSignature("u");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__LeaveJoinedSession(connection, sessionId, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("LeaveJoinedSession");
        msg.hdr_SetSignature("u");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__LeaveSession(connection, sessionId, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("LeaveSession");
        msg.hdr_SetSignature("u");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function signal__org_alljoyn_Bus__LostAdvertisedName(connection, name, transport, prefix) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("LostAdvertisedName");
        msg.hdr_SetSignature("sqs");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        msg.body_Write_Q(transport);
        msg.body_Write_S(prefix);
        connection.SendMsg(msg);
    }
    ;
    function signal__org_alljoyn_Bus__MPSessionChanged(connection, sessionId, name, isAdded) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("MPSessionChanged");
        msg.hdr_SetSignature("usb");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        msg.body_Write_S(name);
        msg.body_Write_B(isAdded);
        connection.SendMsg(msg);
    }
    ;
    function signal__org_alljoyn_Bus__MPSessionChangedWithReason(connection, sessionId, name, isAdded, reason) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("MPSessionChangedWithReason");
        msg.hdr_SetSignature("usbu");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        msg.body_Write_S(name);
        msg.body_Write_B(isAdded);
        msg.body_Write_U(reason);
        connection.SendMsg(msg);
    }
    ;
    function method__org_alljoyn_Bus__OnAppResume(connection, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("OnAppResume");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__OnAppSuspend(connection, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("OnAppSuspend");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__Ping(connection, name, timeout, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("Ping");
        msg.hdr_SetSignature("su");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_S(name);
        msg.body_Write_U(timeout);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function method__org_alljoyn_Bus__ReloadConfig(connection, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("ReloadConfig");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var loaded = msg.body_Read_B();
            if (null != cb)
                cb(connection, loaded);
        });
    }
    ;
    function method__org_alljoyn_Bus__RemoveSessionMember(connection, sessionId, name, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("RemoveSessionMember");
        msg.hdr_SetSignature("us");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        msg.body_Write_S(name);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function signal__org_alljoyn_Bus__SessionLost(connection, sessionId) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("SessionLost");
        msg.hdr_SetSignature("u");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        connection.SendMsg(msg);
    }
    ;
    function signal__org_alljoyn_Bus__SessionLostWithReason(connection, sessionId, reason) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("SessionLostWithReason");
        msg.hdr_SetSignature("uu");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        msg.body_Write_U(reason);
        connection.SendMsg(msg);
    }
    ;
    function signal__org_alljoyn_Bus__SessionLostWithReasonAndDisposition(connection, sessionId, reason, disposition) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("SessionLostWithReasonAndDisposition");
        msg.hdr_SetSignature("uuu");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        msg.body_Write_U(reason);
        msg.body_Write_U(disposition);
        connection.SendMsg(msg);
    }
    ;
    function method__org_alljoyn_Bus__SetIdleTimeouts(connection, reqLinkTO, reqProbeTO, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("SetIdleTimeouts");
        msg.hdr_SetSignature("uu");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(reqLinkTO);
        msg.body_Write_U(reqProbeTO);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            var actLinkTO = msg.body_Read_U();
            var actProbeTO = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition, actLinkTO, actProbeTO);
        });
    }
    ;
    function method__org_alljoyn_Bus__SetLinkTimeout(connection, sessionId, inLinkTO, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("SetLinkTimeout");
        msg.hdr_SetSignature("uu");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_U(sessionId);
        msg.body_Write_U(inLinkTO);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            var outLinkTO = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition, outLinkTO);
        });
    }
    ;
    function method__org_alljoyn_Bus__UnbindSessionPort(connection, port, cb) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.MethodCall);
        msg.hdr_SetInterface("org.alljoyn.Bus");
        msg.hdr_SetObjectPath("/org/alljoyn/Bus");
        msg.hdr_SetDestination("org.alljoyn.Bus");
        msg.hdr_SetMember("UnbindSessionPort");
        msg.hdr_SetSignature("q");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        msg.body_Write_Q(port);
        connection.SendMsgWithCallback(msg, function () {
            msg = msg.m_Reply;
            msg.body_StartReading();
            var disposition = msg.body_Read_U();
            if (null != cb)
                cb(connection, disposition);
        });
    }
    ;
    function handle__org_alljoyn_Bus__FoundAdvertisedName(connection, name, transport, prefix) {
    }
    ;
    function handle__org_alljoyn_Bus__LostAdvertisedName(connection, name, transport, prefix) {
    }
    ;
    function handle__org_alljoyn_Bus__MPSessionChanged(connection, sessionId, name, isAdded) {
    }
    ;
    function handle__org_alljoyn_Bus__MPSessionChangedWithReason(connection, sessionId, name, isAdded, reason) {
    }
    ;
    function handle__org_alljoyn_Bus__SessionLost(connection, sessionId) {
    }
    ;
    function handle__org_alljoyn_Bus__SessionLostWithReason(connection, sessionId, reason) {
    }
    ;
    function handle__org_alljoyn_Bus__SessionLostWithReasonAndDisposition(connection, sessionId, reason, disposition) {
    }
    ;
    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Session - producer
    //==============================================================================================================
    function _org_alljoyn_bus_peer_session_ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "AcceptSession") {
            return __process__org_alljoyn_Bus_Peer_Session__AcceptSession(connection, msg);
        }
        else if (member == "SessionJoined") {
            return __process__org_alljoyn_Bus_Peer_Session__SessionJoined(connection, msg);
        }
        return false;
    }
    function __process__org_alljoyn_Bus_Peer_Session__AcceptSession(connection, msg) {
        msg.body_StartReading();
        var port = msg.body_Read_Q();
        var id = msg.body_Read_U();
        var src = msg.body_Read_S();
        var opts = msg.body_ReadObject("a{sv}");
        var ret = handle__org_alljoyn_Bus_Peer_Session__AcceptSession(connection, port, id, src, opts);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("b");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_B(ret);
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Session__SessionJoined(connection, msg) {
        msg.body_StartReading();
        var port = msg.body_Read_Q();
        var id = msg.body_Read_U();
        var src = msg.body_Read_S();
        handle__org_alljoyn_Bus_Peer_Session__SessionJoined(connection, port, id, src);
        return true;
    }
    function handle__org_alljoyn_Bus_Peer_Session__AcceptSession(connection, port, id, src, opts) {
        return true;
    }
    function handle__org_alljoyn_Bus_Peer_Session__SessionJoined(connection, port, id, src) {
    }
    //==============================================================================================================
    // org.alljoyn.Daemon - producer
    //==============================================================================================================
    function _org_alljoyn_daemon_ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "ProbeAck") {
            return __process__org_alljoyn_Daemon__ProbeAck(connection, msg);
        }
        else if (member == "ProbeReq") {
            return __process__org_alljoyn_Daemon__ProbeReq(connection, msg);
        }
        return false;
    }
    function __process__org_alljoyn_Daemon__ProbeAck(connection, msg) {
        msg.body_StartReading();
        handle__org_alljoyn_Daemon__ProbeAck(connection);
        return true;
    }
    function __process__org_alljoyn_Daemon__ProbeReq(connection, msg) {
        msg.body_StartReading();
        handle__org_alljoyn_Daemon__ProbeReq(connection);
        return true;
    }
    function signal__org_alljoyn_Daemon__ProbeAck(connection) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Daemon");
        msg.hdr_SetObjectPath("x");
        msg.hdr_SetMember("ProbeAck");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        connection.SendMsg(msg);
    }
    function signal__org_alljoyn_Daemon__ProbeReq(connection) {
        var msg = new AJ.MsgGeneric(AJ.MsgType.Signal);
        msg.hdr_SetInterface("org.alljoyn.Daemon");
        msg.hdr_SetObjectPath("x");
        msg.hdr_SetMember("ProbeReq");
        if (null != connection.GetLocalNodeId())
            msg.hdr_SetSender(connection.GetLocalNodeId());
        msg.body_StartWriting();
        connection.SendMsg(msg);
    }
    function handle__org_alljoyn_Daemon__ProbeAck(connection) {
    }
    function handle__org_alljoyn_Daemon__ProbeReq(connection) {
    }
    //==============================================================================================================
    // org.alljoyn.Bus.Peer.Authentication - producer
    //==============================================================================================================
    function _org_alljoyn_bus_peer_authentication_ProcessMsg(connection, msg) {
        var member = msg.hdr_GetMember();
        if (member == "AuthChallenge") {
            return __process__org_alljoyn_Bus_Peer_Authentication__AuthChallenge(connection, msg);
        }
        else if (member == "ExchangeGroupKeys") {
            return __process__org_alljoyn_Bus_Peer_Authentication__ExchangeGroupKeys(connection, msg);
        }
        else if (member == "ExchangeGuids") {
            return __process__org_alljoyn_Bus_Peer_Authentication__ExchangeGuids(connection, msg);
        }
        else if (member == "ExchangeSuites") {
            return __process__org_alljoyn_Bus_Peer_Authentication__ExchangeSuites(connection, msg);
        }
        else if (member == "GenSessionKey") {
            return __process__org_alljoyn_Bus_Peer_Authentication__GenSessionKey(connection, msg);
        }
        else if (member == "KeyAuthentication") {
            return __process__org_alljoyn_Bus_Peer_Authentication__KeyAuthentication(connection, msg);
        }
        else if (member == "KeyExchange") {
            return __process__org_alljoyn_Bus_Peer_Authentication__KeyExchange(connection, msg);
        }
        else if (member == "SendManifest") {
            return __process__org_alljoyn_Bus_Peer_Authentication__SendManifest(connection, msg);
        }
        else if (member == "SendMemberships") {
            return __process__org_alljoyn_Bus_Peer_Authentication__SendMemberships(connection, msg);
        }
        return false;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__AuthChallenge(connection, msg) {
        msg.body_StartReading();
        var challenge = msg.body_Read_S();
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__AuthChallenge(connection, challenge);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("s");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_S(ret);
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__ExchangeGroupKeys(connection, msg) {
        msg.body_StartReading();
        var localKeyMatter = msg.body_Read_AY();
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__ExchangeGroupKeys(connection, localKeyMatter);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("ay");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_AY(ret);
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__ExchangeGuids(connection, msg) {
        msg.body_StartReading();
        var localGuid = msg.body_Read_S();
        var localVersion = msg.body_Read_U();
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__ExchangeGuids(connection, localGuid, localVersion);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("s");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_S(ret);
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__ExchangeSuites(connection, msg) {
        msg.body_StartReading();
        var localAuthList = msg.body_Read_AU();
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__ExchangeSuites(connection, localAuthList);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("au");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_AU(ret);
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__GenSessionKey(connection, msg) {
        msg.body_StartReading();
        var localGuid = msg.body_Read_S();
        var remoteGuid = msg.body_Read_S();
        var localNonce = msg.body_Read_S();
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__GenSessionKey(connection, localGuid, remoteGuid, localNonce);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("s");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_S(ret);
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__KeyAuthentication(connection, msg) {
        msg.body_StartReading();
        var localVerifier = null; // msg.body_ReadVariant(); // XXX - fix this
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__KeyAuthentication(connection, localVerifier);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("v");
        msg.m_Reply.body_StartWriting();
        // msg.m_Reply.body_WriteVariant(ret); // XXX - fix this
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__KeyExchange(connection, msg) {
        msg.body_StartReading();
        var localAuthMask = msg.body_Read_U();
        var localPublicKey = null; // msg.body_ReadVariant(); // XXX - fix this
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__KeyExchange(connection, localAuthMask, localPublicKey);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("u");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_U(ret);
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__SendManifest(connection, msg) {
        msg.body_StartReading();
        var manifest = msg.body_ReadObject("a(ssa(syy))");
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__SendManifest(connection, manifest);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("a(ssa(syy))");
        msg.m_Reply.body_StartWriting();
        // msg.m_Reply.body_WriteObject(ret); // XXX - fix this
        return true;
    }
    function __process__org_alljoyn_Bus_Peer_Authentication__SendMemberships(connection, msg) {
        msg.body_StartReading();
        var sendCode = msg.body_Read_Y();
        var memberships = msg.body_ReadObject("a(yay)");
        var ret = handle__org_alljoyn_Bus_Peer_Authentication__SendMemberships(connection, sendCode, memberships);
        msg.CreateReply();
        msg.m_Reply.hdr_SetSignature("y");
        msg.m_Reply.body_StartWriting();
        msg.m_Reply.body_Write_Y(ret);
        return true;
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__AuthChallenge(connection, challenge) {
        return "default-string";
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__ExchangeGroupKeys(connection, localKeyMatter) {
        return null; //[1, 2, 3];
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__ExchangeGuids(connection, localGuid, localVersion) {
        return "default-string";
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__ExchangeSuites(connection, localAuthList) {
        return null; //[1, 2, 3];
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__GenSessionKey(connection, localGuid, remoteGuid, localNonce) {
        return "default-string";
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__KeyAuthentication(connection, localVerifier) {
        return 0;
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__KeyExchange(connection, localAuthMask, localPublicKey) {
        return 0;
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__SendManifest(connection, manifest) {
        return 0;
    }
    function handle__org_alljoyn_Bus_Peer_Authentication__SendMemberships(connection, sendCode, memberships) {
        return 0;
    }
})(AJ || (AJ = {}));
//# sourceMappingURL=template.js.map