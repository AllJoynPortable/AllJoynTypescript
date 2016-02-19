var AJ;
(function (AJ) {
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
                this.hdr_SetSerialNumber(MsgGeneric.m_NextSerialNumber++);
            }
            else {
                this.m_Data = null;
            }
        }
        MsgGeneric.prototype.FromBuffer = function (bytes) {
            if (bytes.length >= 16) {
                console.log(bytes);
                this.m_Data = bytes;
                var length = 16 + this.RoundedHeaderLength() + this.hdr_GetBodyLength();
                console.log("length : " + length);
                if ((bytes.length >= length) && (length < 1024)) {
                    this.m_Data = new Uint8Array(length);
                    if (bytes.length == length) {
                        this.m_Data.set(bytes);
                    }
                    else {
                        this.m_Data.set(bytes.subarray(0, length));
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
                        this.body_WriteObject(MsgGeneric.GetSubSignature(sig, 1), k);
                    }
                }
                else {
                    var l = v;
                    for (var _a = 0; _a < l.length; _a++) {
                        var o = l[_a];
                        this.body_WriteObject(MsgGeneric.GetSubSignature(sig, 1), o);
                    }
                }
                this.body_Write_A_End((sig[1] == '{') || (sig[1] == '('));
            }
            else if (sig[0] == '{') {
                // XXX - keyvalue pair will be array with 2 elemenst for now
                var kv = v;
                this.Align(8);
                var ss = MsgGeneric.GetSubSignature(sig, 1);
                this.body_WriteObject(ss, kv[0]);
                ss = MsgGeneric.GetSubSignature(sig, 1 + ss.length);
                this.body_WriteObject(ss, kv[1]);
            }
            else if (sig[0] == '(') {
                this.Align(8);
                var idx = 1;
                for (var _b = 0, _c = v; _b < _c.length; _b++) {
                    var o = _c[_b];
                    var ss = MsgGeneric.GetSubSignature(sig, idx);
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
        MsgGeneric.prototype.body_Write_AS = function (v) {
            this.body_Write_A_Start();
            for (var _i = 0; _i < v.length; _i++) {
                var k = v[_i];
                this.body_Write_S(k);
            }
            this.body_Write_A_End(false);
        };
        ;
        MsgGeneric.prototype.body_Write_ROAS = function (v) {
            this.Align(8);
            this.body_Write_O(v[0]);
            this.body_Write_AS(v[1]);
        };
        ;
        MsgGeneric.prototype.body_Write_AROAS = function (v) {
            this.body_Write_A_Start();
            for (var _i = 0; _i < v.length; _i++) {
                var k = v[_i];
                this.body_Write_ROAS(k);
            }
            this.body_Write_A_End(true);
        };
        ;
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
                var ss = MsgGeneric.GetSubSignature(sig, 1);
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
                var subSignature = MsgGeneric.GetSubSignature(sig, 1);
                var k = this.body_ReadObject(subSignature);
                subSignature = MsgGeneric.GetSubSignature(sig, 1 + subSignature.length);
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
                    subSignature = MsgGeneric.GetSubSignature(sig, idx);
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
        MsgGeneric.prototype.body_Read_AS = function () {
            var length = this.body_Read_I();
            var end = this.m_position + length;
            var ret = new Array();
            while (this.m_position < end)
                ret.push(this.body_Read_S());
            return ret;
        };
        ;
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
        MsgGeneric.ValidateSignature = function (signature, single) {
            if ((null == signature) || (0 == signature.length))
                return false;
            var count = 0;
            var idx = 0;
            while (idx < signature.length) {
                var ss = MsgGeneric.GetSubSignature(signature, idx);
                if (null == ss)
                    return false;
                idx += ss.length;
                count++;
            }
            if (single && (count > 1))
                return false;
            return true;
        };
        MsgGeneric.GetSubSignature = function (signature, idx) {
            var end = MsgGeneric.GetSubSignatureEnd(signature, idx);
            if (end > 0) {
                return signature.substring(idx, end);
            }
            else {
                return null;
            }
        };
        MsgGeneric.GetSubSignatureEnd = function (signature, idx) {
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
        };
        MsgGeneric.m_NextSerialNumber = Math.floor(Math.random() * 32000);
        return MsgGeneric;
    })();
    AJ.MsgGeneric = MsgGeneric;
})(AJ || (AJ = {}));
;
//# sourceMappingURL=alljoyn-msg.js.map