"""Protocol fixtures only. No external API is contacted."""
import io,json,threading,unittest,urllib.request,urllib.error
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from server import Handler,official_target,OFFICIAL,NoRedirect
class Protocol(unittest.TestCase):
 def test_allowlist_rejects_credentials_redirect_targets_and_local_addresses(self):
  self.assertTrue(official_target('https://api.openai.com/v1/chat/completions'))
  for url in ['http://127.0.0.1/x','https://api.openai.com.evil.test/v1/chat/completions','https://x@y.com/','https://api.openai.com/v1/chat/completions?key=secret']:
   self.assertFalse(official_target(url))
  self.assertIsNone(NoRedirect().redirect_request(None,None,302,None,None,'https://other.example'))
 def test_http_origin_selection_and_forward_shape(self):
  target='https://api.openai.com/v1/chat/completions';http=ThreadingHTTPServer(('127.0.0.1',0),Handler);http.targets={target};http.allowed_origin='http://127.0.0.1:8776';thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start();url=f'http://127.0.0.1:{http.server_port}/forward';opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
  class Response(io.BytesIO):
   status=200
  class Fixture:
   def open(self,request,timeout):
    assert request.full_url==target
    assert request.headers['Authorization']=='Bearer synthetic-test-secret'
    assert json.loads(request.data)['model']=='fixture'
    return Response(b'{"fixture":true}')
  def request(target_url=target,origin=http.allowed_origin,stream=False):return urllib.request.Request(url,data=json.dumps({'target':target_url,'payload':{'model':'fixture','stream':stream}}).encode(),headers={'Origin':origin,'Authorization':'Bearer synthetic-test-secret','Content-Type':'application/json'})
  try:
   for req,code in [(request(origin='https://evil.example'),403),(request('https://api.deepseek.com/chat/completions'),400),(request(stream=True),400)]:
    with self.assertRaises(urllib.error.HTTPError)as caught:opener.open(req)
    self.assertEqual(caught.exception.code,code)
   with patch('server.urllib.request.build_opener',return_value=Fixture()):
    with opener.open(request())as response:
     self.assertEqual(response.headers['Access-Control-Allow-Origin'],http.allowed_origin);self.assertEqual(json.load(response),{'fixture':True})
  finally:http.shutdown();http.server_close();thread.join()
if __name__=='__main__':unittest.main()
