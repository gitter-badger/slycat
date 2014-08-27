.. _PUT Model Parameter:

PUT Model Parameter
===================
Description
-----------

Stores a model parameter (name / value pair) artifact. The value is a
JSON expression and may be arbitrarily complex.

Requests
--------

Syntax
^^^^^^

::

    PUT /models/(mid)/parameters/(name)

Accepts
^^^^^^^

application/json

Clients must provide a JSON request body containing an arbitrary "value"
and a boolean "input" parameter.

Responses
---------

Returns
^^^^^^^

Examples
--------

Sample Request
^^^^^^^^^^^^^^

::

    PUT /models/1385a75dd2eb4faba884cefdd0b94a56/parameters/baz HTTP/1.1
    Host: localhost:8093
    Content-Length: 20
    Accept-Encoding: gzip, deflate, compress
    Accept: */*
    User-Agent: python-requests/1.2.3 CPython/2.7.5 Linux/2.6.32-358.23.2.el6.x86_64
    content-type: application/json
    Authorization: Basic c2x5Y2F0OnNseWNhdA==

    {
      value : [1, 2, 3],
      input : true
    }

Sample Response
^^^^^^^^^^^^^^^

::

    HTTP/1.1 200 OK
    Date: Mon, 25 Nov 2013 20:36:04 GMT
    Content-Length: 0
    Content-Type: text/html;charset=utf-8
    Server: CherryPy/3.2.2

